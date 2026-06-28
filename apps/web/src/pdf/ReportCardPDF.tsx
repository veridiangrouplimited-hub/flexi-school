import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const C = { brand: '#15803d', dark: '#1e293b', muted: '#64748b', light: '#f8fafc', border: '#e2e8f0', white: '#ffffff', accent: '#dcfce7' };

const s = StyleSheet.create({
  page:        { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: C.dark },
  title:       { textAlign: 'center', marginBottom: 16 },
  schoolName:  { fontSize: 18, fontWeight: 'bold', color: C.brand, textAlign: 'center' },
  motto:       { fontSize: 8, color: C.muted, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  cardTitle:   { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, color: C.dark },
  divider:     { borderBottom: `2pt solid ${C.brand}`, marginVertical: 12 },
  thinLine:    { borderBottom: `0.5pt solid ${C.border}`, marginVertical: 8 },

  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  infoCell:    { width: '50%', marginBottom: 6 },
  infoLabel:   { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:   { fontSize: 9, fontWeight: 'bold', marginTop: 1 },

  tableHead:   { flexDirection: 'row', backgroundColor: C.brand, padding: '5 6' },
  thText:      { color: C.white, fontSize: 7.5, fontWeight: 'bold' },
  tableRow:    { flexDirection: 'row', padding: '5 6', borderBottom: `0.5pt solid ${C.border}` },
  tableRowAlt: { backgroundColor: C.light },

  colSubject:  { flex: 3 },
  colCA:       { flex: 1, textAlign: 'center' },
  colExam:     { flex: 1, textAlign: 'center' },
  colTotal:    { flex: 1, textAlign: 'center' },
  colGrade:    { flex: 1, textAlign: 'center' },
  colRemark:   { flex: 2 },
  colPos:      { flex: 1, textAlign: 'right' },

  gradeA:      { color: '#166534', fontWeight: 'bold' },
  gradeB:      { color: '#1d4ed8', fontWeight: 'bold' },
  gradeC:      { color: '#92400e', fontWeight: 'bold' },
  gradeF:      { color: '#991b1b', fontWeight: 'bold' },

  summaryGrid: { flexDirection: 'row', marginTop: 12, gap: 8 },
  summaryBox:  { flex: 1, backgroundColor: C.light, padding: '8 10', borderRadius: 2, borderLeft: `3pt solid ${C.brand}` },
  sumLabel:    { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  sumValue:    { fontSize: 13, fontWeight: 'bold', color: C.brand, marginTop: 2 },

  sigRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  sigBlock:    { flex: 1, alignItems: 'center' },
  sigLine:     { borderBottom: `1pt solid ${C.dark}`, width: 120, marginBottom: 4 },
  sigLabel:    { fontSize: 7.5, color: C.muted },

  footer:      { position: 'absolute', bottom: 28, left: 40, right: 40, borderTop: `0.5pt solid ${C.border}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 7, color: C.muted },
  stamp:       { backgroundColor: C.accent, padding: '2 8', borderRadius: 2 },
  stampText:   { fontSize: 7, color: '#166534', fontWeight: 'bold' },
});

interface ReportCard {
  student: { name: string; admissionNo: string; class: string | null; session: string | null; term: string };
  results: Array<{ subjectName: string; subjectCode: string | null; components: Record<string, number>; total: number; grade: string; remark: string; gradePoints: number; position: number | null; classSize: number }>;
  summary: { totalScore: number; average: number; gpa: number; subjectCount: number; overallPosition: number | null; classSize: number };
}

function gradeStyle(grade: string) {
  if (grade.startsWith('A')) return s.gradeA;
  if (grade.startsWith('B')) return s.gradeB;
  if (grade.startsWith('C')) return s.gradeC;
  return s.gradeF;
}

export function ReportCardPDF({ card, schoolName, motto }: { card: ReportCard; schoolName: string; motto?: string }) {
  const caKey   = Object.keys(card.results[0]?.components ?? {}).find(k => k.toLowerCase().includes('ca')) ?? 'CA';
  const examKey = Object.keys(card.results[0]?.components ?? {}).find(k => k.toLowerCase().includes('exam')) ?? 'Exam';

  return (
    <Document title={`Report Card — ${card.student.name}`} author={schoolName}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.title}>
          <Text style={s.schoolName}>{schoolName}</Text>
          {motto && <Text style={s.motto}>{motto}</Text>}
          <Text style={s.cardTitle}>Student Report Card</Text>
        </View>
        <View style={s.divider} />

        {/* Student info */}
        <View style={s.infoGrid}>
          <View style={s.infoCell}><Text style={s.infoLabel}>Student Name</Text><Text style={s.infoValue}>{card.student.name}</Text></View>
          <View style={s.infoCell}><Text style={s.infoLabel}>Admission Number</Text><Text style={s.infoValue}>{card.student.admissionNo}</Text></View>
          <View style={s.infoCell}><Text style={s.infoLabel}>Class</Text><Text style={s.infoValue}>{card.student.class ?? '—'}</Text></View>
          <View style={s.infoCell}><Text style={s.infoLabel}>Session</Text><Text style={s.infoValue}>{card.student.session ?? '—'}</Text></View>
          <View style={s.infoCell}><Text style={s.infoLabel}>Term</Text><Text style={s.infoValue}>{card.student.term} TERM</Text></View>
          <View style={s.infoCell}><Text style={s.infoLabel}>Class Size</Text><Text style={s.infoValue}>{card.summary.classSize} Students</Text></View>
        </View>

        {/* Table */}
        <View style={s.tableHead}>
          <Text style={[s.thText, s.colSubject]}>Subject</Text>
          <Text style={[s.thText, s.colCA]}>{caKey}</Text>
          <Text style={[s.thText, s.colExam]}>{examKey}</Text>
          <Text style={[s.thText, s.colTotal]}>Total</Text>
          <Text style={[s.thText, s.colGrade]}>Grade</Text>
          <Text style={[s.thText, s.colRemark]}>Remark</Text>
          <Text style={[s.thText, s.colPos]}>Pos.</Text>
        </View>
        {card.results.map((r, i) => (
          <View key={r.subjectName} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.colSubject, { fontSize: 9 }]}>{r.subjectName}</Text>
            <Text style={[s.colCA,    { fontSize: 9, textAlign: 'center' }]}>{r.components[caKey] ?? '—'}</Text>
            <Text style={[s.colExam,  { fontSize: 9, textAlign: 'center' }]}>{r.components[examKey] ?? '—'}</Text>
            <Text style={[s.colTotal, { fontSize: 9, fontWeight: 'bold', textAlign: 'center' }]}>{r.total}</Text>
            <Text style={[s.colGrade, { fontSize: 9, textAlign: 'center' }, gradeStyle(r.grade)]}>{r.grade}</Text>
            <Text style={[s.colRemark, { fontSize: 9 }]}>{r.remark}</Text>
            <Text style={[s.colPos, { fontSize: 9, textAlign: 'right' }]}>{r.position ?? '—'}/{r.classSize}</Text>
          </View>
        ))}

        {/* Summary boxes */}
        <View style={s.summaryGrid}>
          <View style={s.summaryBox}><Text style={s.sumLabel}>Total Score</Text><Text style={s.sumValue}>{card.summary.totalScore}</Text></View>
          <View style={s.summaryBox}><Text style={s.sumLabel}>Average</Text><Text style={s.sumValue}>{card.summary.average}%</Text></View>
          <View style={s.summaryBox}><Text style={s.sumLabel}>GPA</Text><Text style={s.sumValue}>{card.summary.gpa}</Text></View>
          <View style={s.summaryBox}><Text style={s.sumLabel}>Position</Text><Text style={s.sumValue}>{card.summary.overallPosition ?? '—'}/{card.summary.classSize}</Text></View>
        </View>

        {/* Signature row */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Class Teacher</Text></View>
          <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Head of Department</Text></View>
          <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Principal</Text></View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{schoolName} — Generated by FlexiSchool</Text>
          <View style={s.stamp}><Text style={s.stampText}>OFFICIAL DOCUMENT</Text></View>
          <Text style={s.footerText}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
      </Page>
    </Document>
  );
}
