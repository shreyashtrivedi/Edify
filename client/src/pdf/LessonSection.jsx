/**
 * One lesson as PDF elements. Used on its own (lesson PDF) and once per lesson inside the
 * course PDF. Each block type has a small component, mirroring the web LessonRenderer.
 *
 * Print-specific choices:
 *  - Quiz questions are printed without the answers; an answer key follows them.
 *  - Videos and readings become clickable links (you can't play a video on paper).
 *  - minPresenceAhead keeps a heading from being left alone at the bottom of a page.
 */
import { Link, Text, View } from '@react-pdf/renderer';
import { parseInline } from '../utils/inlineFormat';
import { formatDuration } from '../utils/format';
import { webSearchUrl, youtubeSearchUrl } from '../utils/paths';
import { colors, styles } from './styles';
import { pdfText } from './text';

const LETTERS = 'ABCDEF';

/** react-pdf collapses leading spaces, which would flatten code indentation. Non-breaking
 *  spaces (same width in a monospace font) are kept as-is. */
const keepIndentation = (code) => code.replace(/^ +/gm, (spaces) => '\u00a0'.repeat(spaces.length));

/** Text with **bold**, *italic* and `code` segments (same parser as the website). */
function RichText({ text, style }) {
  return (
    <Text style={style}>
      {parseInline(text).map(({ type, value }, index) => {
        const segmentStyle = { bold: styles.bold, italic: styles.italic, code: styles.inlineCode }[type];
        return (
          <Text key={index} style={segmentStyle}>
            {pdfText(value)}
          </Text>
        );
      })}
    </Text>
  );
}

const CALLOUTS = {
  tip: { label: 'Tip', color: colors.tip, background: colors.tipSoft },
  note: { label: 'Note', color: colors.brand, background: colors.brandSoft },
  warning: { label: 'Watch out', color: colors.warning, background: colors.warningSoft },
};

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={styles.heading} minPresenceAhead={60}>
          {pdfText(block.text)}
        </Text>
      );
    case 'paragraph':
      return <RichText text={block.text} style={styles.paragraph} />;
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem} wrap={false}>
              <Text style={styles.listMarker}>{block.ordered ? `${index + 1}.` : '•'}</Text>
              <RichText text={item} style={styles.listText} />
            </View>
          ))}
        </View>
      );
    case 'code':
      return (
        <View style={styles.codeBox}>
          {block.language !== 'text' && <Text style={styles.codeLabel}>{block.language}</Text>}
          <Text style={styles.code}>{keepIndentation(pdfText(block.text))}</Text>
        </View>
      );
    case 'callout': {
      const callout = CALLOUTS[block.variant] ?? CALLOUTS.note;
      return (
        <View
          style={[styles.callout, { borderLeftColor: callout.color, backgroundColor: callout.background }]}
          wrap={false}
        >
          <Text style={[styles.boxLabel, { color: callout.color }]}>{callout.label}</Text>
          <RichText text={block.text} />
        </View>
      );
    }
    case 'video':
      return <VideoLink block={block} />;
    default:
      return null; // mcq is handled separately; unknown types are skipped
  }
}

function VideoLink({ block }) {
  const { video, query } = block;
  return (
    <View style={styles.videoBox} wrap={false}>
      <Text style={[styles.boxLabel, { color: '#dc2626' }]}>Watch</Text>
      {video ? (
        <>
          <Link src={`https://www.youtube.com/watch?v=${video.videoId}`} style={styles.link}>
            {pdfText(video.title)}
          </Link>
          <Text style={[styles.muted, styles.small]}>
            {pdfText(video.channel)}
            {video.durationSeconds ? `  ·  ${formatDuration(video.durationSeconds)}` : ''}
          </Text>
        </>
      ) : (
        <Link src={youtubeSearchUrl(query)} style={styles.link}>
          Search YouTube for "{pdfText(query)}"
        </Link>
      )}
    </View>
  );
}

function Quiz({ questions }) {
  return (
    <View>
      <Text style={styles.sectionTitle} minPresenceAhead={80}>
        Check your understanding
      </Text>
      {questions.map((mcq, number) => (
        <View key={number} style={styles.question} wrap={false}>
          <Text style={styles.questionText}>
            {number + 1}. {pdfText(mcq.question)}
          </Text>
          {mcq.options.map((option, index) => (
            <View key={index} style={styles.option}>
              <Text style={styles.optionLetter}>{LETTERS[index]}.</Text>
              <RichText text={option} style={styles.listText} />
            </View>
          ))}
        </View>
      ))}

      <View wrap={false}>
        <Text style={[styles.boxLabel, { marginTop: 14, color: colors.muted }]}>Answer key</Text>
        {questions.map((mcq, number) => (
          <Text key={number} style={[styles.small, { marginTop: 2 }]}>
            <Text style={styles.bold}>
              {number + 1}. {LETTERS[mcq.answer]}
            </Text>
            {mcq.explanation ? `  ${pdfText(mcq.explanation)}` : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Readings({ resources }) {
  return (
    <View>
      <Text style={styles.sectionTitle} minPresenceAhead={40}>
        Suggested readings
      </Text>
      {resources.map((resource, index) => (
        <View key={index} style={styles.listItem} wrap={false}>
          <Text style={styles.listMarker}>•</Text>
          <Text style={styles.listText}>
            <Link src={resource.url || webSearchUrl(resource.searchQuery)} style={styles.link}>
              {pdfText(resource.title)}
            </Link>
            <Text style={styles.muted}> ({resource.type})</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * @param {object} props
 * @param {object} props.lesson   { title, objectives, keyTopics, content, resources }
 * @param {string} props.kicker   e.g. "Module 2 · Lesson 3"
 */
export default function LessonSection({ lesson, kicker }) {
  const questions = lesson.content.filter((block) => block.type === 'mcq');

  return (
    <View>
      <Text style={styles.kicker}>{pdfText(kicker)}</Text>
      <Text style={styles.lessonTitle}>{pdfText(lesson.title)}</Text>

      {lesson.objectives?.length > 0 && (
        <View style={styles.objectivesBox} wrap={false}>
          <Text style={[styles.boxLabel, { color: colors.brand }]}>What you&apos;ll learn</Text>
          {lesson.objectives.map((objective, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listMarker, { color: colors.brand }]}>•</Text>
              <Text style={styles.listText}>{pdfText(objective)}</Text>
            </View>
          ))}
          {lesson.keyTopics?.length > 0 && (
            <Text style={[styles.small, styles.muted, { marginTop: 6 }]}>
              Key topics: {pdfText(lesson.keyTopics.join('  ·  '))}
            </Text>
          )}
        </View>
      )}

      {lesson.content.map((block, index) => (
        <Block key={index} block={block} />
      ))}

      {questions.length > 0 && <Quiz questions={questions} />}
      {lesson.resources?.length > 0 && <Readings resources={lesson.resources} />}
    </View>
  );
}
