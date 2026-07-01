import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const C = {
  brand:  '#15803d',
  brandDark: '#14532d',
  dark:   '#1e293b',
  muted:  '#64748b',
  light:  '#f8fafc',
  border: '#e2e8f0',
  white:  '#ffffff',
};

const STATUS_COLORS = {
  PRESENT: { fg: '#166534', bg: '#dcfce7' },
  ABSENT:  { fg: '#991b1b', bg: '#fee2e2' },
  LATE:    { fg: '#92400e', bg: '#fef3c7' },
  EXCUSED: { fg: '#1d4ed8', bg: '#dbeafe' },
};

const s = StyleSheet.create({
  page:       { paddingTop: 0, paddingBottom: 58, paddingHorizontal: 0, fontSize: 9, fontFamily: 'Helvetica', color: C.dark },
  band:       { height: 6, backgroundColor: C.brand },
  bandAccent: { height: 2, backgroundColor: C.brandDark },
  body:       { paddingHorizontal: 36, paddingTop: 22 },

  watermark:  {
    position: 'absolute', top: 340, left: 60, width: 480,
    textAlign: 'center', fontSize: 64, fontWeight: 'bold',
    color: C.brand, opacity: 0.04, transform: 'rotate(-30deg)',
  },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: `2pt solid ${C.brand}` },
  crestRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crest:      {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
    border: `2pt solid ${C.brandDark}`,
  },
  crestText:  { color: C.white, fontSize: 16, fontWeight: 'bold' },
  schoolName: { fontSize: 14, fontWeight: 'bold', color: C.brand },
  subtitle:   { fontSize: 8, color: C.muted, marginTop: 2 },
  meta:       { textAlign: 'right' },
  metaTitle:  { fontSize: 12, fontWeight: 'bold', color: C.dark, letterSpacing: 1 },
  metaLine:   { fontSize: 8, color: C.muted, marginTop: 2 },

  // Attendance rate bar
  rateWrap:   { marginBottom: 12 },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  rateLabel:  { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  ratePct:    { fontSize: 7.5, fontWeight: 'bold', color: C.brandDark },
  rateTrack:  { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  rateFill:   { height: 8, backgroundColor: C.brand, borderRadius: 4 },

  tableHead:  { flexDirection: 'row', backgroundColor: C.brand, padding: '6 8', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  thText:     { color: C.white, fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow:   { flexDirection: 'row', alignItems: 'center', padding: '4.5 8', borderBottom: `0.5pt solid ${C.border}` },
  tableRowAlt: { backgroundColor: C.light },

  colNo:      { width: 28, textAlign: 'center' },
  colAdm:     { width: 80 },
  colName:    { flex: 1 },
  colStatus:  { width: 76, alignItems: 'center' },
  colNote:    { width: 70 },

  statusChip: { fontSize: 7, fontWeight: 'bold', padding: '2 8', borderRadius: 8, letterSpacing: 0.5 },
  statusNone: { fontSize: 7.5, color: C.muted },

  summary:    { flexDirection: 'row', marginTop: 14, gap: 8 },
  sumBox:     { flex: 1, padding: '7 9', borderRadius: 3 },
  sumLabel:   { fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.75 },
  sumValue:   { fontSize: 14, fontWeight: 'bold', marginTop: 1 },

  legend:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: C.light, borderRadius: 3, padding: '5 10', border: `0.5pt solid ${C.border}` },
  legendTitle: { fontSize: 7, fontWeight: 'bold', color: C.brandDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot:  { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 7, color: C.muted },

  sigRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigBlock:   { alignItems: 'center' },
  sigLine:    { borderBottom: `1pt solid ${C.dark}`, width: 110, marginBottom: 4 },
  sigLabel:   { fontSize: 7.5, color: C.muted },

  footer:     {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.light, borderTop: `1pt solid ${C.border}`,
    paddingVertical: 10, paddingHorizontal: 36,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7, color: C.muted },
});

type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;

interface StudentRow { studentId: string; admissionNo: string; fullName: string; status: Status; notes: string | null; }

interface AttendanceRegisterProps {
  className:  string;
  date:       string;
  students:   StudentRow[];
  schoolName: string;
}

function StatusChip({ status }: { status: Status }) {
  if (!status) return <Text style={s.statusNone}>NOT MARKED</Text>;
  const c = STATUS_COLORS[status];
  return (
    <Text style={[s.statusChip, { color: c.fg, backgroundColor: c.bg }]}>{status}</Text>
  );
}

export function AttendanceRegisterPDF({ className, date, students, schoolName }: AttendanceRegisterProps) {
  const present = students.filter(s => s.status === 'PRESENT').length;
  const absent  = students.filter(s => s.status === 'ABSENT').length;
  const late    = students.filter(s => s.status === 'LATE').length;
  const excused = students.filter(s => s.status === 'EXCUSED').length;
  const total   = students.length;
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document title={`Attendance Register — ${className} — ${date}`} author={schoolName}>
      <Page size="A4" style={s.page}>
        {/* Brand bands */}
        <View style={s.band} fixed />
        <View style={s.bandAccent} fixed />

        {/* Watermark */}
        <Text style={s.watermark} fixed>{schoolName.toUpperCase()}</Text>

        <View style={s.body}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.crestRow}>
              <View style={s.crest}><Text style={s.crestText}>{schoolName.charAt(0).toUpperCase()}</Text></View>
              <View>
                <Text style={s.schoolName}>{schoolName}</Text>
                <Text style={s.subtitle}>Daily Attendance Register</Text>
              </View>
            </View>
            <View style={s.meta}>
              <Text style={s.metaTitle}>{className}</Text>
              <Text style={s.metaLine}>{fmtDate(date)}</Text>
              <Text style={s.metaLine}>{total} students on roll</Text>
            </View>
          </View>

          {/* Attendance rate bar */}
          <View style={s.rateWrap}>
            <View style={s.rateHeader}>
              <Text style={s.rateLabel}>Attendance Rate</Text>
              <Text style={s.ratePct}>{pct}% present</Text>
            </View>
            <View style={s.rateTrack}>
              <View style={[s.rateFill, { width: `${pct}%` }]} />
            </View>
          </View>

          {/* Table */}
          <View style={s.tableHead}>
            <Text style={[s.thText, s.colNo]}>#</Text>
            <Text style={[s.thText, s.colAdm]}>Adm. No.</Text>
            <Text style={[s.thText, s.colName]}>Student Name</Text>
            <Text style={[s.thText, { width: 76, textAlign: 'center' }]}>Status</Text>
            <Text style={[s.thText, s.colNote]}>Notes</Text>
          </View>
          {students.map((r, i) => (
            <View key={r.studentId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.colNo, { textAlign: 'center', color: C.muted }]}>{i + 1}</Text>
              <Text style={s.colAdm}>{r.admissionNo}</Text>
              <Text style={s.colName}>{r.fullName}</Text>
              <View style={s.colStatus}><StatusChip status={r.status} /></View>
              <Text style={s.colNote}>{r.notes ?? ''}</Text>
            </View>
          ))}

          {/* Summary chips */}
          <View style={s.summary}>
            <View style={[s.sumBox, { backgroundColor: C.light, borderLeft: `3pt solid ${C.brand}` }]}>
              <Text style={[s.sumLabel, { color: C.muted }]}>Total</Text>
              <Text style={[s.sumValue, { color: C.brandDark }]}>{total}</Text>
            </View>
            <View style={[s.sumBox, { backgroundColor: STATUS_COLORS.PRESENT.bg }]}>
              <Text style={[s.sumLabel, { color: STATUS_COLORS.PRESENT.fg }]}>Present</Text>
              <Text style={[s.sumValue, { color: STATUS_COLORS.PRESENT.fg }]}>{present}</Text>
            </View>
            <View style={[s.sumBox, { backgroundColor: STATUS_COLORS.ABSENT.bg }]}>
              <Text style={[s.sumLabel, { color: STATUS_COLORS.ABSENT.fg }]}>Absent</Text>
              <Text style={[s.sumValue, { color: STATUS_COLORS.ABSENT.fg }]}>{absent}</Text>
            </View>
            <View style={[s.sumBox, { backgroundColor: STATUS_COLORS.LATE.bg }]}>
              <Text style={[s.sumLabel, { color: STATUS_COLORS.LATE.fg }]}>Late</Text>
              <Text style={[s.sumValue, { color: STATUS_COLORS.LATE.fg }]}>{late}</Text>
            </View>
            <View style={[s.sumBox, { backgroundColor: STATUS_COLORS.EXCUSED.bg }]}>
              <Text style={[s.sumLabel, { color: STATUS_COLORS.EXCUSED.fg }]}>Excused</Text>
              <Text style={[s.sumValue, { color: STATUS_COLORS.EXCUSED.fg }]}>{excused}</Text>
            </View>
          </View>

          {/* Legend */}
          <View style={s.legend}>
            <Text style={s.legendTitle}>Legend</Text>
            {(Object.keys(STATUS_COLORS) as Array<keyof typeof STATUS_COLORS>).map(k => (
              <View key={k} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: STATUS_COLORS[k].fg }]} />
                <Text style={s.legendText}>{k.charAt(0) + k.slice(1).toLowerCase()}</Text>
              </View>
            ))}
            <Text style={s.legendText}>· Unmarked students shown as "Not Marked"</Text>
          </View>

          {/* Signature */}
          <View style={s.sigRow}>
            <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Class Teacher / Form Master</Text></View>
            <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Date</Text></View>
            <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Vice Principal (Academics)</Text></View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{schoolName} — Attendance Register · Generated by FlexiSchool</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Generated ${new Date().toLocaleDateString('en-GB')} · Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}
