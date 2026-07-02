import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { requirePermission } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';
import { createPayPalOrder, capturePayPalOrder } from './paypal.service';

export const financeRouter = Router();

const CURRENCY = process.env.FINANCE_CURRENCY ?? 'NGN';
const FRONTEND = process.env.FRONTEND_URL       ?? 'http://localhost:5173';

// PayPal does not support NGN — charge the USD equivalent at a configured rate.
const NGN_USD_RATE = Number(process.env.NGN_USD_RATE ?? 1500);

// ── Fee categories ───────────────────────────────────────────────────────────

financeRouter.get('/categories', async (req, res, next) => {
  try {
    const cats = await prisma.feeCategory.findMany({
      where:   { tenantId: req.tenant.id, isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(cats);
  } catch (err) { next(err); }
});

// ── Summary ──────────────────────────────────────────────────────────────────

financeRouter.get('/summary', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const where = { tenantId: req.tenant.id, ...(sessionId ? { sessionId: sessionId as string } : {}) };

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({ where, select: { totalAmount: true, status: true } }),
      prisma.payment.findMany({
        where: { tenantId: req.tenant.id, status: 'COMPLETED', ...(sessionId ? { invoice: { sessionId: sessionId as string } } : {}) },
        select: { amount: true },
      }),
    ]);

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const totalPaid     = payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding   = invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').reduce((s, i) => s + Number(i.totalAmount), 0);
    const overdue       = invoices.filter(i => i.status === 'OVERDUE').length;

    res.json({ totalInvoiced, totalPaid, outstanding, overdue, currency: CURRENCY });
  } catch (err) { next(err); }
});

// ── Invoices list ─────────────────────────────────────────────────────────────

financeRouter.get('/invoices', async (req, res, next) => {
  try {
    const { sessionId, studentId, status, term } = req.query;

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(sessionId ? { sessionId: sessionId as string } : {}),
        ...(studentId ? { studentId: studentId as string } : {}),
        ...(status    ? { status: status as 'UNPAID' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED' } : {}),
        ...(term      ? { term: term as 'FIRST' | 'SECOND' | 'THIRD' } : {}),
      },
      include: {
        student:  { include: { user: { select: { profile: true } } } },
        session:  { select: { name: true } },
        items:    { include: { feeCategory: { select: { name: true } } } },
        payments: { where: { status: 'COMPLETED' }, select: { amount: true, paidAt: true, gateway: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices.map(inv => ({
      id:          inv.id,
      studentId:   inv.studentId,
      studentName: ((inv.student.user?.profile as Record<string, unknown>)?.fullName as string) ?? inv.student.admissionNo,
      admissionNo: inv.student.admissionNo,
      session:     inv.session.name,
      sessionId:   inv.sessionId,
      term:        inv.term,
      status:      inv.status,
      totalAmount: Number(inv.totalAmount),
      dueDate:     inv.dueDate,
      notes:       inv.notes,
      currency:    CURRENCY,
      items:       inv.items.map(it => ({
        id:           it.id,
        category:     it.feeCategory.name,
        description:  it.description,
        amount:       Number(it.amount),
      })),
      payments: inv.payments.map(p => ({
        amount:  Number(p.amount),
        paidAt:  p.paidAt,
        gateway: p.gateway,
      })),
      createdAt: inv.createdAt,
    })));
  } catch (err) { next(err); }
});

// ── Single invoice ────────────────────────────────────────────────────────────

financeRouter.get('/invoices/:id', async (req, res, next) => {
  try {
    const inv = await prisma.invoice.findUnique({
      where:   { id: req.params.id },
      include: {
        student:  { include: { user: { select: { profile: true } } } },
        session:  { select: { name: true } },
        items:    { include: { feeCategory: { select: { name: true } } } },
        payments: true,
      },
    });

    if (!inv || inv.tenantId !== req.tenant.id) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }
    res.json(inv);
  } catch (err) { next(err); }
});

// ── Create invoice ────────────────────────────────────────────────────────────

const createInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  sessionId: z.string().uuid(),
  term:      z.enum(['FIRST', 'SECOND', 'THIRD']),
  dueDate:   z.string().optional(),
  notes:     z.string().optional(),
  items: z.array(z.object({
    feeCategoryId: z.string().uuid(),
    description:   z.string().optional(),
    amount:        z.number().positive(),
  })).min(1),
});

financeRouter.post('/invoices', requirePermission('finance:write'), async (req, res, next) => {
  try {
    const body  = createInvoiceSchema.parse(req.body);
    const total = body.items.reduce((s, i) => s + i.amount, 0);

    const invoice = await prisma.invoice.create({
      data: {
        tenantId:    req.tenant.id,
        studentId:   body.studentId,
        sessionId:   body.sessionId,
        term:        body.term,
        totalAmount: total,
        dueDate:     body.dueDate ? new Date(body.dueDate) : undefined,
        notes:       body.notes,
        items: {
          create: body.items.map(it => ({
            tenantId:      req.tenant.id,
            feeCategoryId: it.feeCategoryId,
            description:   it.description ?? null,
            amount:        it.amount,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
});

// ── Checkout: initiate payment ────────────────────────────────────────────────

const checkoutSchema = z.object({
  gateway: z.enum(['PAYPAL', 'CASH', 'BANK_TRANSFER']),
});

financeRouter.post('/invoices/:id/checkout', requirePermission('finance:write'), async (req, res, next) => {
  try {
    const { gateway } = checkoutSchema.parse(req.body);

    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });
    if (!inv || inv.tenantId !== req.tenant.id) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (inv.status === 'PAID') throw new AppError('Invoice is already paid', 400, 'ALREADY_PAID');

    // Cash / bank transfer — mark paid immediately (admin action)
    if (gateway === 'CASH' || gateway === 'BANK_TRANSFER') {
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            tenantId:  req.tenant.id,
            invoiceId: inv.id,
            amount:    inv.totalAmount,
            currency:  CURRENCY,
            gateway,
            status:    'COMPLETED',
            paidAt:    new Date(),
          },
        }),
        prisma.invoice.update({
          where: { id: inv.id },
          data:  { status: 'PAID' },
        }),
      ]);
      return res.json({ success: true, gateway });
    }

    // PayPal — create order and return approval URL.
    // PayPal doesn't support NGN, so charge the USD equivalent.
    const returnUrl = `${FRONTEND}/finance/payment/success?invoiceId=${inv.id}`;
    const cancelUrl = `${FRONTEND}/finance/payment/cancel?invoiceId=${inv.id}`;

    const isNgn = CURRENCY === 'NGN';
    const paypalAmount   = isNgn
      ? (Number(inv.totalAmount) / NGN_USD_RATE).toFixed(2)
      : Number(inv.totalAmount).toFixed(2);
    const paypalCurrency = isNgn ? 'USD' : CURRENCY;

    const { orderId, approvalUrl } = await createPayPalOrder({
      amount:    paypalAmount,
      currency:  paypalCurrency,
      invoiceId: inv.id,
      returnUrl,
      cancelUrl,
    });

    // Record pending payment
    await prisma.payment.create({
      data: {
        tenantId:      req.tenant.id,
        invoiceId:     inv.id,
        amount:        inv.totalAmount,
        currency:      CURRENCY,
        gateway:       'PAYPAL',
        gatewayRef:    orderId,
        gatewayStatus: 'CREATED',
        status:        'PENDING',
      },
    });

    res.json({ approvalUrl, orderId });
  } catch (err) { next(err); }
});

// ── Capture: confirm PayPal payment ──────────────────────────────────────────

const captureSchema = z.object({ orderId: z.string() });

financeRouter.post('/invoices/:id/capture', requirePermission('finance:write'), async (req, res, next) => {
  try {
    const { orderId } = captureSchema.parse(req.body);

    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!inv || inv.tenantId !== req.tenant.id) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

    const result = await capturePayPalOrder(orderId);

    if (result.status !== 'COMPLETED') {
      throw new AppError(`Payment not completed (status: ${result.status})`, 400, 'PAYMENT_NOT_COMPLETED');
    }

    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { invoiceId: inv.id, gatewayRef: orderId },
        data:  { status: 'COMPLETED', paidAt: new Date(), gatewayStatus: result.status },
      }),
      prisma.invoice.update({
        where: { id: inv.id },
        data:  { status: 'PAID' },
      }),
    ]);

    res.json({ success: true });
  } catch (err) { next(err); }
});
