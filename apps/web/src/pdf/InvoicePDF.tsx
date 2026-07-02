import { Document, Page, View, Text, StyleSheet, type Styles } from '@react-pdf/renderer';

const C = {
  brand:  '#15803d',
  brandDark: '#14532d',
  dark:   '#1e293b',
  muted:  '#64748b',
  light:  '#f8fafc',
  border: '#e2e8f0',
  white:  '#ffffff',
  accent: '#dcfce7',
};

const s = StyleSheet.create({
  page:        { paddingTop: 0, paddingBottom: 64, paddingHorizontal: 0, fontSize: 9, fontFamily: 'Helvetica', color: C.dark, backgroundColor: C.white },
  band:        { height: 6, backgroundColor: C.brand },
  bandAccent:  { height: 2, backgroundColor: C.brandDark },
  body:        { paddingHorizontal: 44, paddingTop: 28 },

  watermark:   {
    position: 'absolute', top: 340, left: 60, width: 480,
    textAlign: 'center', fontSize: 92, fontWeight: 'bold',
    color: C.brand, opacity: 0.05, transform: 'rotate(-30deg)',
  },

  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: `2pt solid ${C.brand}` },
  crestRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crest:       {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
    border: `2pt solid ${C.brandDark}`,
  },
  crestText:   { color: C.white, fontSize: 18, fontWeight: 'bold' },
  schoolName:  { fontSize: 17, fontWeight: 'bold', color: C.brand },
  schoolSub:   { fontSize: 8, color: C.muted, marginTop: 2 },
  invoiceTitle: { fontSize: 24, fontWeight: 'bold', color: C.dark, textAlign: 'right', letterSpacing: 2 },
  invoiceNo:   { fontSize: 9, color: C.muted, textAlign: 'right', marginTop: 3 },

  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaBlock:   { flex: 1 },
  metaLabel:   { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue:   { fontSize: 10, fontWeight: 'bold' },
  metaLine:    { fontSize: 9, marginTop: 2, color: C.muted },

  tableHead:   { flexDirection: 'row', backgroundColor: C.brand, padding: '7 10', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  thText:      { color: C.white, fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow:    { flexDirection: 'row', padding: '7 10', borderBottom: `0.5pt solid ${C.border}` },
  tableRowAlt: { backgroundColor: C.light },
  tdDesc:      { flex: 3, fontSize: 9 },
  tdCat:       { flex: 2, fontSize: 9, color: C.muted },
  tdAmt:       { flex: 1, fontSize: 9, textAlign: 'right' },

  // Totals block
  totalsWrap:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalsBox:   { minWidth: 220 },
  totalsLine:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 12 },
  totalsLabel: { fontSize: 9, color: C.muted },
  totalsValue: { fontSize: 9, fontWeight: 'bold' },
  balanceRow:  { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.brand, padding: '9 12', borderRadius: 3, marginTop: 4 },
  balanceLabel: { color: C.white, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceAmt:  { color: C.white, fontWeight: 'bold', fontSize: 13 },

  statusRow:   { flexDirection: 'row', marginTop: 14, alignItems: 'center', gap: 6 },
  statusBadge: { padding: '3 10', borderRadius: 10, fontSize: 8, fontWeight: 'bold', letterSpacing: 1 },
  statusPaid:  { backgroundColor: '#dcfce7', color: '#166534' },
  statusUnpaid: { backgroundColor: '#fef3c7', color: '#92400e' },
  statusOverdue: { backgroundColor: '#fee2e2', color: '#991b1b' },

  payHist:     { marginTop: 16 },
  payHistTitle: { fontSize: 8, fontWeight: 'bold', color: C.brandDark, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  payRow:      { flexDirection: 'row', justifyContent: 'space-between', fontSize: 8.5, paddingVertical: 3, paddingHorizontal: 8, borderBottom: `0.5pt solid ${C.border}`, color: C.muted },

  noteBox:     { marginTop: 18, backgroundColor: C.light, borderLeft: `3pt solid ${C.brand}`, padding: '8 12', borderRadius: 2 },
  noteTitle:   { fontSize: 8, fontWeight: 'bold', color: C.brandDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  noteText:    { fontSize: 8, color: C.muted, lineHeight: 1.5 },

  thanks:      { marginTop: 14, fontSize: 9, fontStyle: 'italic', color: C.muted, textAlign: 'center' },

  footer:      {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.light, borderTop: `1pt solid ${C.border}`,
    paddingVertical: 12, paddingHorizontal: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText:  { fontSize: 7, color: C.muted },
  pageNum:     { fontSize: 7, color: C.muted },
});

interface InvoiceItem { id: string; category: string; description: string | null; amount: number; }
interface InvoicePmt  { amount: number; paidAt: string | null; gateway: string; }
interface Invoice {
  id: string; studentName: string; admissionNo: string;
  session: string; term: string; status: string;
  totalAmount: number; dueDate: string | null; currency: string;
  items: InvoiceItem[]; payments: InvoicePmt[]; createdAt: string;
  notes?: string | null;
}

function fmt(amount: number, currency: string) {
  // Use the currency CODE in PDFs — the naira sign (₦) is not in the
  // standard Helvetica glyph set and would render as a missing character.
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Styles = {
  PAID: s.statusPaid, UNPAID: s.statusUnpaid, OVERDUE: s.statusOverdue,
  PARTIAL: s.statusUnpaid, CANCELLED: s.statusUnpaid,
};

export function InvoicePDF({ invoice, schoolName }: { invoice: Invoice; schoolName: string }) {
  const subtotal  = invoice.items.reduce((sum, it) => sum + Number(it.amount), 0);
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance   = Math.max(0, Number(invoice.totalAmount) - totalPaid);
  const isPaid    = invoice.status === 'PAID';

  return (
    <Document title={`Invoice — ${invoice.studentName}`} author={schoolName}>
      <Page size="A4" style={s.page}>
        {/* Brand bands */}
        <View style={s.band} fixed />
        <View style={s.bandAccent} fixed />

        {/* Diagonal status watermark */}
        <Text style={s.watermark} fixed>{isPaid ? 'PAID' : invoice.status}</Text>

        <View style={s.body}>
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.crestRow}>
              <View style={s.crest}><Text style={s.crestText}>{schoolName.charAt(0).toUpperCase()}</Text></View>
              <View>
                <Text style={s.schoolName}>{schoolName}</Text>
                <Text style={s.schoolSub}>FlexiSchool Management System</Text>
              </View>
            </View>
            <View>
              <Text style={s.invoiceTitle}>INVOICE</Text>
              <Text style={s.invoiceNo}>Ref: INV-{invoice.id.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>

          {/* Meta */}
          <View style={s.metaRow}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Bill To</Text>
              <Text style={s.metaValue}>{invoice.studentName}</Text>
              <Text style={s.metaLine}>Admission No: {invoice.admissionNo}</Text>
              <Text style={s.metaLine}>{invoice.session} · {invoice.term} Term</Text>
            </View>
            <View style={[s.metaBlock, { alignItems: 'flex-end' }]}>
              <View style={{ marginBottom: 6 }}>
                <Text style={s.metaLabel}>Issue Date</Text>
                <Text style={s.metaValue}>{fmtDate(invoice.createdAt)}</Text>
              </View>
              {invoice.dueDate && (
                <View>
                  <Text style={s.metaLabel}>Due Date</Text>
                  <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Items table */}
          <View style={s.tableHead}>
            <Text style={[s.thText, s.tdDesc]}>Description</Text>
            <Text style={[s.thText, s.tdCat]}>Category</Text>
            <Text style={[s.thText, s.tdAmt]}>Amount</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View key={it.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={s.tdDesc}>{it.description ?? it.category}</Text>
              <Text style={s.tdCat}>{it.category}</Text>
              <Text style={s.tdAmt}>{fmt(it.amount, invoice.currency)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={s.totalsWrap}>
            <View style={s.totalsBox}>
              <View style={s.totalsLine}>
                <Text style={s.totalsLabel}>Subtotal</Text>
                <Text style={s.totalsValue}>{fmt(subtotal, invoice.currency)}</Text>
              </View>
              <View style={s.totalsLine}>
                <Text style={s.totalsLabel}>Amount Paid</Text>
                <Text style={[s.totalsValue, { color: C.brand }]}>−{fmt(totalPaid, invoice.currency)}</Text>
              </View>
              <View style={s.balanceRow}>
                <Text style={s.balanceLabel}>{isPaid ? 'Total Paid' : 'Balance Due'}</Text>
                <Text style={s.balanceAmt}>{fmt(isPaid ? invoice.totalAmount : balance, invoice.currency)}</Text>
              </View>
            </View>
          </View>

          {/* Status */}
          <View style={s.statusRow}>
            <Text style={[s.statusBadge, STATUS_STYLE[invoice.status] ?? s.statusUnpaid]}>
              {invoice.status}
            </Text>
            {invoice.notes && <Text style={{ fontSize: 8, color: C.muted }}>{invoice.notes}</Text>}
          </View>

          {/* Payment history */}
          {invoice.payments.length > 0 && (
            <View style={s.payHist}>
              <Text style={s.payHistTitle}>Payment History</Text>
              {invoice.payments.map((p, i) => (
                <View key={i} style={s.payRow}>
                  <Text>{p.gateway.replace(/_/g, ' ')} · {fmtDate(p.paidAt)}</Text>
                  <Text>{fmt(p.amount, invoice.currency)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* How to pay */}
          {!isPaid && (
            <View style={s.noteBox}>
              <Text style={s.noteTitle}>How to Pay</Text>
              <Text style={s.noteText}>
                Pay online via the FlexiSchool parent portal (PayPal accepted), or pay by cash / bank
                transfer at the school bursary. Please quote reference INV-{invoice.id.slice(0, 8).toUpperCase()} with
                all payments.
              </Text>
            </View>
          )}

          <Text style={s.thanks}>Thank you for your prompt payment. It keeps our school running smoothly.</Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{schoolName} · Generated by FlexiSchool</Text>
          <Text style={s.footerText}>This is a computer-generated document — no signature required</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${fmtDate(new Date().toISOString())} · Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
