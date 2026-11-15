/**
 * PDF design tokens + styles. @react-pdf/renderer uses a subset of CSS (flexbox, padding,
 * borders, fonts) written as JS objects, and sizes are in points (72 pt = 1 inch).
 * The colours match the app's light theme (index.css).
 */
import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  ink: '#1c1b19',
  muted: '#6b675f',
  line: '#e5e2db',
  subtle: '#f1efea',
  brand: '#4f46e5',
  brandSoft: '#eef0ff',
  tip: '#059669',
  tipSoft: '#ecfdf5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 54,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    lineHeight: 1.5,
    color: colors.ink,
  },

  // Repeated on every page (`fixed`)
  header: {
    position: 'absolute',
    top: 24,
    left: 54,
    right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.muted,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
    paddingBottom: 6,
  },
  footerLeft: { position: 'absolute', bottom: 24, left: 54, fontSize: 8, color: colors.muted },
  // The page number is filled in after layout (render prop). react-pdf mis-places such text
  // when it is positioned with `bottom`, so it is placed from the top of the A4 page
  // (841.89 pt tall) at the same height as footerLeft, full width and right-aligned.
  footerRight: {
    position: 'absolute',
    top: 841.89 - 24 - 12,
    left: 54,
    right: 54,
    fontSize: 8,
    color: colors.muted,
    textAlign: 'right',
  },
  brandMark: { fontFamily: 'Helvetica-Bold', color: colors.brand },

  // Lesson header
  kicker: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    letterSpacing: 1,
    color: colors.brand,
    textTransform: 'uppercase',
  },
  lessonTitle: { fontFamily: 'Helvetica-Bold', fontSize: 22, lineHeight: 1.25, marginTop: 6 },
  objectivesBox: {
    marginTop: 16,
    marginBottom: 6,
    padding: 12,
    borderRadius: 6,
    backgroundColor: colors.brandSoft,
  },
  boxLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  // Blocks
  heading: { fontFamily: 'Helvetica-Bold', fontSize: 14, lineHeight: 1.3, marginTop: 18, marginBottom: 4 },
  paragraph: { marginTop: 6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  inlineCode: { fontFamily: 'Courier', fontSize: 9.5, backgroundColor: colors.subtle },
  list: { marginTop: 6 },
  listItem: { flexDirection: 'row', marginTop: 2 },
  listMarker: { width: 16, color: colors.muted },
  listText: { flex: 1 },
  codeBox: { marginTop: 8, padding: 10, borderRadius: 6, backgroundColor: colors.subtle },
  codeLabel: { fontSize: 7.5, color: colors.muted, marginBottom: 4, textTransform: 'uppercase' },
  code: { fontFamily: 'Courier', fontSize: 8.5, lineHeight: 1.4 },
  callout: { marginTop: 10, padding: 10, borderLeftWidth: 3, borderRadius: 4 },
  videoBox: {
    marginTop: 10,
    padding: 10,
    borderWidth: 0.75,
    borderColor: colors.line,
    borderRadius: 6,
  },
  link: { color: colors.brand, textDecoration: 'none' },
  muted: { color: colors.muted },
  small: { fontSize: 8.5 },

  // Quiz + readings
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    marginTop: 22,
    paddingTop: 12,
    borderTopWidth: 0.75,
    borderTopColor: colors.line,
  },
  question: { marginTop: 10 },
  questionText: { fontFamily: 'Helvetica-Bold' },
  option: { flexDirection: 'row', marginTop: 2, paddingLeft: 8 },
  optionLetter: { width: 16, fontFamily: 'Helvetica-Bold', color: colors.muted },

  // Course cover + contents
  coverPage: { padding: 64, fontFamily: 'Helvetica', color: colors.ink, justifyContent: 'center' },
  coverTitle: { fontFamily: 'Helvetica-Bold', fontSize: 32, lineHeight: 1.2, marginTop: 14 },
  coverDescription: { fontSize: 13, lineHeight: 1.5, color: colors.muted, marginTop: 14 },
  coverMeta: { marginTop: 28, fontSize: 10, color: colors.muted },
  tocModule: { fontFamily: 'Helvetica-Bold', fontSize: 11.5, marginTop: 14 },
  tocLesson: { flexDirection: 'row', marginTop: 3, paddingLeft: 14 },
  tocNumber: { width: 30, fontFamily: 'Courier', fontSize: 9, color: colors.muted, paddingTop: 1 },
});
