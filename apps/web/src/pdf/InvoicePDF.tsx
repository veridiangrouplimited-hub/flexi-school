import { Document, Page, View, Text, StyleSheet, type Styles } from '@react-pdf/renderer';

const C = { brand: '#15803d', dark: '#1e293b', muted: '#64748b', light: '#f8fafc', border: '#e2e8f0', white: '#ffffff' };

const s = StyleSheet.create({
  page:        { padding: 44, fontSize: 9, fontFamily: 'Helvetica', color: C.dark, backgroundColor: C.white },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: `2pt solid ${C.brand}` },
  schoolName:  { fontSize: 18, fontWeight: 'bold', color: C.brand },
  schoolSub:   { fontSize: 8, color: C.muted, marginTop: 2 },
  invoiceTitle: { fontSize: 22, fontWeight: 'bold', color: C.muted, textAlign: 'right' },
  invoiceNo:   { fontSize: 8, color: C.muted, textAlign: 'right', marginTop: 3 },

  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaBlock:   { flex: 1 },
  metaLabel:   { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue:   { fontSize: 9, fontWeight: 'bold' },
  metaLine:    { fontSize: 9, marginTop: 2 },

  tableHead:   { flexDirection: 'row', backgroundColor: C.brand, padding: '6 8', marginBottom: 0 },
  thText:      { color: C.white, fontSize: 8, fontWeight: 'bold' },
  tableRow:    { flexDirection: 'row', padding: '6 8', borderBottom: `0.5pt solid ${C.border}` },
  tableRowAlt: { backgroundColor: C.light },
  tdDesc:      { flex: 3, fontSize: 9 },
  tdCat:       { flex: 2, fontSize: 9, color: C.muted },
  tdAmt:       { flex: 1, fontSize: 9, textAlign: 'right' },

  divider:     { borderBottom: `0.5pt solid ${C.border}`, marginVertical: 12 },

  totalSection: { marginTop: 4, alignItems: 'flex-end' },
  totalRow:    { flexDirection: 'row', backgroundColor: C.brand, padding: '8 12', minWidth: 180, justifyContent: 'space-between', borderRadius: 2 },
  totalLabel:  { color: C.white, fontWeight: 'bold', fontSize: 10 },
  totalAmt:    { color: C.white, fontWeight: 'bold', fontSize: 12 },

  statusRow:   { flexDirection: 'row', marginTop: 12, alignItems: 'center', gap: 6 },
  statusBadge: { padding: '3 8', borderRadius: 2, fontSize: 8, fontWeight: 'bold' },
  statusPaid:  { backgroundColor: '#dcfce7', color: '#166534' },
  statusUnpaid: { backgroundColor: '#fef3c7', color: '#92400e' },
  statusOverdue: { backgroundColor: '#fee2e2', color: '#991b1b' },

  footer:      { position: 'absolute', bottom: 30, left: 44, right: 44, borderTop: `0.5pt solid ${C.border}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText:  { fontSize: 7, color: C.muted },

  payHist:     { marginTop: 12 },
  payHistTitle: { fontSize: 8, fontWeight: 'bold', color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  payRow:      { flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, marginBottom: 2, color: C.muted },
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
  return (
    <Document title={`Invoice — ${invoice.studentName}`} author={schoolName}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.schoolName}>{schoolName}</Text>
            <Text style={s.schoolSub}>FlexiSchool Management System</Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceNo}>#{invoice.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Bill To</Text>
            <Text style={s.metaValue}>{invoice.studentName}</Text>
            <Text style={s.metaLine}>Adm. No: {invoice.admissionNo}</Text>
          </View>
          <View style={[s.metaBlock, { alignItems: 'flex-end' }]}>
            <View style={{ marginBottom: 6 }}>
              <Text style={s.metaLabel}>Session / Term</Text>
              <Text style={s.metaValue}>{invoice.session} · {invoice.term}</Text>
            </View>
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

        {/* Table */}
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

        {/* Total */}
        <View style={s.totalSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalAmt}>{fmt(invoice.totalAmount, invoice.currency)}</Text>
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
                <Text>{p.gateway.replace('_', ' ')} · {fmtDate(p.paidAt)}</Text>
                <Text>{fmt(p.amount, invoice.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{schoolName} — Generated by FlexiSchool</Text>
          <Text style={s.footerText}>{fmtDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}
