import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

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
  page:        { paddingTop: 0, paddingBottom: 60, paddingHorizontal: 0, fontSize: 9, fontFamily: 'Helvetica', color: C.dark },
  band:        { height: 6, backgroundColor: C.brand },
  bandAccent:  { height: 2, backgroundColor: C.brandDark },
  body:        { paddingHorizontal: 40, paddingTop: 22 },

  watermark:   {
    position: 'absolute', top: 330, left: 60, width: 480,
    textAlign: 'center', fontSize: 68, fontWeight: 'bold',
    color: C.brand, opacity: 0.045, transform: 'rotate(-30deg)',
  },

  // Header with crest
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 },
  crest:       {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
    border: `2pt solid ${C.brandDark}`,
  },
  crestText:   { color: C.white, fontSize: 20, fontWeight: 'bold' },
  headerText:  { alignItems: 'center' },
  schoolName:  { fontSize: 19, fontWeight: 'bold', color: C.brand, textAlign: 'center' },
  motto:       { fontSize: 8, color: C.muted, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  cardTitleWrap: { alignItems: 'center', marginTop: 8 },
  cardTitle:   {
    fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2,
    color: C.brandDark, backgroundColor: C.accent, padding: '4 16', borderRadius: 10,
  },
  divider:     { borderBottom: `2pt solid ${C.brand}`, marginVertical: 12 },

  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.light, borderRadius: 4, padding: '10 12', marginBottom: 12, border: `0.5pt solid ${C.border}` },
  infoCell:    { width: '33.33%', marginBottom: 6 },
  infoLabel:   { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:   { fontSize: 9.5, fontWeight: 'bold', marginTop: 1 },

  tableHead:   { flexDirection: 'row', backgroundColor: C.brand, padding: '6 8', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  thText:      { color: C.white, fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow:    { flexDirection: 'row', padding: '5 8', borderBottom: `0.5pt solid ${C.border}` },
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
  summaryBox:  { flex: 1, backgroundColor: C.light, padding: '8 10', borderRadius: 3, borderLeft: `3pt solid ${C.brand}` },
  sumLabel:    { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  sumValue:    { fontSize: 14, fontWeight: 'bold', color: C.brand, marginTop: 2 },

  // Performance bar
  perfWrap:    { marginTop: 12 },
  perfHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  perfLabel:   { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  perfPct:     { fontSize: 7.5, fontWeight: 'bold', color: C.brandDark },
  perfTrack:   { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  perfFill:    { height: 8, backgroundColor: C.brand, borderRadius: 4 },

  // Grading key
  keyWrap:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: C.light, borderRadius: 3, padding: '6 10', border: `0.5pt solid ${C.border}` },
  keyTitle:    { fontSize: 7, fontWeight: 'bold', color: C.brandDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  keyItem:     { fontSize: 7, color: C.muted },

  // Comments
  commentBox:  { marginTop: 12, border: `0.5pt solid ${C.border}`, borderRadius: 3, padding: '8 10' },
  commentTitle: { fontSize: 7.5, fontWeight: 'bold', color: C.brandDark, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  commentLine: { borderBottom: `0.5pt dotted ${C.muted}`, height: 14 },

  sigRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  sigBlock:    { flex: 1, alignItems: 'center' },
  sigLine:     { borderBottom: `1pt solid ${C.dark}`, width: 120, marginBottom: 4 },
  sigLabel:    { fontSize: 7.5, color: C.muted },

  footer:      {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.light, borderTop: `1pt solid ${C.border}`,
    paddingVertical: 10, paddingHorizontal: 40,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText:  { fontSize: 7, color: C.muted },
  stamp:       { backgroundColor: C.accent, padding: '2 10', borderRadius: 8 },
  stampText:   { fontSize: 7, color: '#166534', fontWeight: 'bold', letterSpacing: 0.8 },
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
  return (
    <Document title={`Report Card — ${card.student.name}`} author={schoolName}>
      <ReportCardPage card={card} schoolName={schoolName} motto={motto} />
    </Document>
  );
}

/** Batch document — one report card page per student (whole class or school). */
export function ClassReportCardsPDF({ cards, schoolName, motto, batchLabel }: {
  cards: ReportCard[]; schoolName: string; motto?: string; batchLabel?: string;
}) {
  return (
    <Document title={`Report Cards — ${batchLabel ?? `${cards.length} students`}`} author={schoolName}>
      {cards.map((card, i) => (
        <ReportCardPage key={`${card.student.admissionNo}-${i}`} card={card} schoolName={schoolName} motto={motto} />
      ))}
    </Document>
  );
}

function ReportCardPage({ card, schoolName, motto }: { card: ReportCard; schoolName: string; motto?: string }) {
  const caKey   = Object.keys(card.results[0]?.components ?? {}).find(k => k.toLowerCase().includes('ca')) ?? 'CA';
  const examKey = Object.keys(card.results[0]?.components ?? {}).find(k => k.toLowerCase().includes('exam')) ?? 'Exam';
  const avgPct  = Math.min(100, Math.max(0, card.summary.average));

  return (
      <Page size="A4" style={s.page}>
        {/* Brand bands */}
        <View style={s.band} fixed />
        <View style={s.bandAccent} fixed />

        {/* Watermark */}
        <Text style={s.watermark} fixed>{schoolName.toUpperCase()}</Text>

        <View style={s.body}>
          {/* Header with crest */}
          <View style={s.headerRow}>
            <View style={s.crest}><Text style={s.crestText}>{schoolName.charAt(0).toUpperCase()}</Text></View>
            <View style={s.headerText}>
              <Text style={s.schoolName}>{schoolName}</Text>
              {motto && <Text style={s.motto}>“{motto}”</Text>}
            </View>
          </View>
          <View style={s.cardTitleWrap}>
            <Text style={s.cardTitle}>Student Report Card — {card.student.term} Term</Text>
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

          {/* Results table */}
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

          {/* Performance bar */}
          <View style={s.perfWrap}>
            <View style={s.perfHeader}>
              <Text style={s.perfLabel}>Overall Performance</Text>
              <Text style={s.perfPct}>{avgPct}%</Text>
            </View>
            <View style={s.perfTrack}>
              <View style={[s.perfFill, { width: `${avgPct}%` }]} />
            </View>
          </View>

          {/* Grading key */}
          <View style={s.keyWrap}>
            <Text style={s.keyTitle}>Grading Key</Text>
            <Text style={s.keyItem}>A: 70–100 (Excellent)</Text>
            <Text style={s.keyItem}>B: 60–69 (Very Good)</Text>
            <Text style={s.keyItem}>C: 50–59 (Good)</Text>
            <Text style={s.keyItem}>D: 40–49 (Fair)</Text>
            <Text style={s.keyItem}>F: 0–39 (Fail)</Text>
          </View>

          {/* Comment boxes */}
          <View style={s.commentBox}>
            <Text style={s.commentTitle}>Class Teacher's Comment</Text>
            <View style={s.commentLine} />
          </View>
          <View style={s.commentBox}>
            <Text style={s.commentTitle}>Principal's Comment</Text>
            <View style={s.commentLine} />
          </View>

          {/* Signature row */}
          <View style={s.sigRow}>
            <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Class Teacher</Text></View>
            <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Head of Department</Text></View>
            <View style={s.sigBlock}><View style={s.sigLine} /><Text style={s.sigLabel}>Principal</Text></View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{schoolName} — Generated by FlexiSchool</Text>
          <View style={s.stamp}><Text style={s.stampText}>OFFICIAL DOCUMENT</Text></View>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>
  );
}
