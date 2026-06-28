import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const C = { brand: '#15803d', dark: '#1e293b', muted: '#64748b', light: '#f8fafc', border: '#e2e8f0', white: '#ffffff' };

const s = StyleSheet.create({
  page:       { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: C.dark },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 10, borderBottom: `2pt solid ${C.brand}` },
  schoolName: { fontSize: 14, fontWeight: 'bold', color: C.brand },
  subtitle:   { fontSize: 8, color: C.muted, marginTop: 2 },
  meta:       { textAlign: 'right' },
  metaTitle:  { fontSize: 12, fontWeight: 'bold', color: C.dark },
  metaLine:   { fontSize: 8, color: C.muted, marginTop: 2 },

  tableHead:  { flexDirection: 'row', backgroundColor: C.brand, padding: '5 6' },
  thText:     { color: C.white, fontSize: 8, fontWeight: 'bold' },
  tableRow:   { flexDirection: 'row', padding: '5 6', borderBottom: `0.5pt solid ${C.border}` },
  tableRowAlt: { backgroundColor: C.light },

  colNo:      { width: 28, textAlign: 'center' },
  colAdm:     { width: 80 },
  colName:    { flex: 1 },
  colStatus:  { width: 68, textAlign: 'center' },
  colNote:    { width: 70 },

  statusPresent: { color: '#166534', fontWeight: 'bold' },
  statusAbsent:  { color: '#991b1b', fontWeight: 'bold' },
  statusLate:    { color: '#92400e', fontWeight: 'bold' },
  statusExcused: { color: '#1d4ed8' },
  statusNone:    { color: C.muted },

  summary:    { flexDirection: 'row', marginTop: 12, gap: 8 },
  sumBox:     { flex: 1, backgroundColor: C.light, padding: '6 8', borderLeft: `3pt solid ${C.brand}` },
  sumLabel:   { fontSize: 7, color: C.muted, textTransform: 'uppercase' },
  sumValue:   { fontSize: 13, fontWeight: 'bold', color: C.brand, marginTop: 1 },

  sigRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigBlock:   { alignItems: 'center' },
  sigLine:    { borderBottom: `1pt solid ${C.dark}`, width: 110, marginBottom: 4 },
  sigLabel:   { fontSize: 7.5, color: C.muted },

  footer:     { position: 'absolute', bottom: 24, left: 36, right: 36, borderTop: `0.5pt solid ${C.border}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
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

function statusStyle(st: Status) {
  if (st === 'PRESENT') return s.statusPresent;
  if (st === 'ABSENT')  return s.statusAbsent;
  if (st === 'LATE')    return s.statusLate;
  if (st === 'EXCUSED') return s.statusExcused;
  return s.statusNone;
}

export function AttendanceRegisterPDF({ className, date, students, schoolName }: AttendanceRegisterProps) {
  const present = students.filter(s => s.status === 'PRESENT').length;
  const absent  = students.filter(s => s.status === 'ABSENT').length;
  const late    = students.filter(s => s.status === 'LATE').length;
  const total   = students.length;
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document title={`Attendance Register — ${className} — ${date}`} author={schoolName}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.schoolName}>{schoolName}</Text>
            <Text style={s.subtitle}>FlexiSchool Attendance Register</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.metaTitle}>ATTENDANCE REGISTER</Text>
            <Text style={s.metaLine}>Class: {className}</Text>
            <Text style={s.metaLine}>{fmtDate(date)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHead}>
          <Text style={[s.thText, s.colNo]}>#</Text>
          <Text style={[s.thText, s.colAdm]}>Adm. No.</Text>
          <Text style={[s.thText, s.colName]}>Student Name</Text>
          <Text style={[s.thText, s.colStatus]}>Status</Text>
          <Text style={[s.thText, s.colNote]}>Notes</Text>
        </View>
        {students.map((r, i) => (
          <View key={r.studentId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.colNo, { textAlign: 'center' }]}>{i + 1}</Text>
            <Text style={s.colAdm}>{r.admissionNo}</Text>
            <Text style={s.colName}>{r.fullName}</Text>
            <Text style={[s.colStatus, { textAlign: 'center' }, statusStyle(r.status)]}>
              {r.status ?? 'NOT MARKED'}
            </Text>
            <Text style={s.colNote}>{r.notes ?? ''}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={s.summary}>
          <View style={s.sumBox}><Text style={s.sumLabel}>Total</Text><Text style={s.sumValue}>{total}</Text></View>
          <View style={s.sumBox}><Text style={s.sumLabel}>Present</Text><Text style={[s.sumValue, { color: '#166534' }]}>{present}</Text></View>
          <View style={s.sumBox}><Text style={s.sumLabel}>Absent</Text><Text style={[s.sumValue, { color: '#991b1b' }]}>{absent}</Text></View>
          <View style={s.sumBox}><Text style={s.sumLabel}>Late</Text><Text style={[s.sumValue, { color: '#92400e' }]}>{late}</Text></View>
          <View style={s.sumBox}><Text style={s.sumLabel}>Attendance %</Text><Text style={s.sumValue}>{pct}%</Text></View>
        </View>

        {/* Signature */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Class Teacher / Form Master</Text></View>
          <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Date</Text></View>
          <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Vice Principal (Academics)</Text></View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{schoolName} — Attendance Register</Text>
          <Text style={s.footerText}>Generated: {new Date().toLocaleDateString('en-GB')}</Text>
        </View>
      </Page>
    </Document>
  );
}
