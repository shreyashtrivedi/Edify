/**
 * The two PDF documents Edify can export.
 *
 *  LessonDocument: one lesson.
 *  CourseDocument: a small book: cover, clickable table of contents, then every generated
 *                  lesson on its own pages. PDF bookmarks (the sidebar in PDF viewers) are
 *                  nested Module → Lesson.
 */
import { Document, Link, Page, Text, View } from '@react-pdf/renderer';
import LessonSection from './LessonSection';
import { styles } from './styles';
import { pdfText } from './text';

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

/** Header + footer drawn on every page (`fixed`), with "page x of y" numbering. */
function PageChrome({ title }) {
  return (
    <>
      <View style={styles.header} fixed>
        <Text style={styles.brandMark}>Edify</Text>
        <Text>{pdfText(title)}</Text>
      </View>
      {/* Footer: separate absolutely positioned Texts (a footer View mis-positions in react-pdf) */}
      <Text style={styles.footerLeft} fixed>
        Generated with Edify
      </Text>
      <Text
        style={styles.footerRight}
        fixed
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </>
  );
}

export function LessonDocument({ course, moduleIndex, lessonIndex, lesson }) {
  const module = course.modules[moduleIndex];
  return (
    <Document title={lesson.title} author="Edify" subject={course.title} creator="Edify">
      <Page size="A4" style={styles.page}>
        <PageChrome title={course.title} />
        <LessonSection
          lesson={lesson}
          kicker={`Module ${moduleIndex + 1}: ${module.title}  ·  Lesson ${lessonIndex + 1}`}
        />
      </Page>
    </Document>
  );
}

/**
 * `course` comes from GET /api/courses/:id/export (lessons include their content).
 * `exportedAt` is passed in (not read inside) so rendering stays a pure function of its props.
 */
export function CourseDocument({ course, exportedAt }) {
  const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
  const generatedCount = course.modules.reduce(
    (total, module) => total + module.lessons.filter((lesson) => lesson.isEnriched).length,
    0,
  );
  const date = exportedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document title={course.title} author="Edify" subject={course.description} creator="Edify">
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={[styles.brandMark, { fontSize: 14 }]}>Edify</Text>
        <Text style={styles.coverTitle}>{pdfText(course.title)}</Text>
        <Text style={styles.coverDescription}>{pdfText(course.description)}</Text>
        <Text style={styles.coverMeta}>
          {LEVEL_LABELS[course.level] ?? 'Beginner'}  ·  {course.modules.length} modules  ·  {lessonCount} lessons
        </Text>
        {course.tags?.length > 0 && (
          <Text style={[styles.coverMeta, { marginTop: 6 }]}>
            {course.tags.map((tag) => `#${pdfText(tag)}`).join('   ')}
          </Text>
        )}
        <Text style={[styles.coverMeta, { marginTop: 6 }]}>Exported on {date}</Text>
      </Page>

      {/* Contents + lessons */}
      <Page size="A4" style={styles.page}>
        <PageChrome title={course.title} />

        <Text style={styles.lessonTitle} bookmark="Contents">
          Contents
        </Text>
        {generatedCount < lessonCount && (
          <Text style={[styles.small, styles.muted, { marginTop: 4 }]}>
            {generatedCount} of {lessonCount} lessons are included. Lessons are written the first time they are
            opened in Edify; open the others to add them to this PDF.
          </Text>
        )}
        {course.modules.map((module, moduleIndex) => (
          <View key={module._id} wrap={false}>
            <Text style={styles.tocModule}>
              Module {moduleIndex + 1}: {pdfText(module.title)}
            </Text>
            {module.lessons.map((lesson, lessonIndex) => (
              <View key={lesson._id} style={styles.tocLesson}>
                <Text style={styles.tocNumber}>
                  {moduleIndex + 1}.{lessonIndex + 1}
                </Text>
                {lesson.isEnriched ? (
                  // "#id" links jump to the element with that id inside this PDF
                  <Link src={`#lesson-${lesson._id}`} style={[styles.link, styles.listText]}>
                    {pdfText(lesson.title)}
                  </Link>
                ) : (
                  <Text style={[styles.listText, styles.muted]}>{pdfText(lesson.title)} (not generated yet)</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Lessons are direct children of the Page: a `break` (start on a new page) nested inside
            a wrapper View makes the layout engine loop forever. */}
        {course.modules.flatMap((module, moduleIndex) =>
          module.lessons
            .filter((lesson) => lesson.isEnriched)
            .map((lesson) => {
              const lessonIndex = module.lessons.indexOf(lesson);
              return (
                <View
                  key={lesson._id}
                  id={`lesson-${lesson._id}`}
                  bookmark={`${moduleIndex + 1}.${lessonIndex + 1}  ${pdfText(lesson.title)}`}
                  break
                >
                  <LessonSection
                    lesson={lesson}
                    kicker={`Module ${moduleIndex + 1}: ${module.title}  ·  Lesson ${lessonIndex + 1}`}
                  />
                </View>
              );
            }),
        )}
      </Page>
    </Document>
  );
}
