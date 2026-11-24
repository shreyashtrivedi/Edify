import { useDocumentTitle } from '../hooks/useDocumentTitle';

const GITHUB_PROFILE = 'https://github.com/shreyashtrivedi';

/** Public page: what Edify stores, why, and who else processes it (linked from the footer). */
export default function PrivacyPage() {
  useDocumentTitle('Privacy policy');

  return (
    <article className="mx-auto max-w-3xl pb-8 text-[0.95rem] leading-7 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-2 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 24 November 2026</p>

      <p className="mt-6">
        Edify is a student project built by Shreyash Trivedi for the Text-to-Learn hackathon. This
        page explains what the app stores, why, and who else is involved. Edify has no ads and no
        analytics, and it never sells data.
      </p>

      <h2>What Edify stores</h2>
      <ul>
        <li>
          <strong>Your profile:</strong> the name, email address and profile picture from your
          login, and when you last logged in. Your account itself is identified by the ID that Auth0
          gives it.
        </li>
        <li>
          <strong>Your courses:</strong> the topics you type, the courses and lessons generated for
          you, and the Hinglish audio recorded for a lesson.
        </li>
        <li>
          <strong>Your progress:</strong> which lessons you have completed and your quiz answers.
        </li>
        <li>
          <strong>Your tutor chats:</strong> the questions you ask in “Ask a doubt” and their
          answers (the latest 60 messages per lesson), so you can read them again later.
        </li>
        <li>
          <strong>In your browser:</strong> the sign-in library keeps your session (in local
          storage, plus a small cookie that remembers you are logged in), and Edify saves your theme
          choice. There are no advertising or analytics trackers.
        </li>
      </ul>

      <h2>Who else processes data</h2>
      <ul>
        <li>
          <strong>Auth0</strong> handles sign-in. If you continue with Google, Google shares your
          name, email address and picture with Auth0 and Edify. Passwords never reach Edify.
        </li>
        <li>
          <strong>Google Gemini</strong> writes the courses, lessons, audio and tutor answers. The
          topics you type, lesson content and your tutor questions are sent to Google’s Gemini API.
          Edify uses Gemini’s free tier, under which Google may use this content to improve its
          products and people at Google may review it, so please don’t type personal or sensitive
          information.
        </li>
        <li>
          <strong>YouTube:</strong> lessons show a video thumbnail. The YouTube player
          (youtube-nocookie.com) only loads when you press play, and YouTube’s own privacy policy
          applies from then on.
        </li>
        <li>
          <strong>Hosting:</strong> MongoDB Atlas (database), Render (server) and Vercel (website).
          Like most servers, they keep short-term technical logs, such as IP addresses and the pages
          requested, for security and debugging.
        </li>
      </ul>

      <h2>Share links</h2>
      <p>
        If you turn on sharing for a course, anyone with the link can read that course’s content.
        Your name and email address are never shown. You can turn the link off at any time and it
        stops working immediately; people who already saved a copy keep their copy.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete any course from its page. This removes the course, its lessons, and your
        progress, tutor chats and audio for it. To delete your profile and everything else, contact
        me (below) and I will remove it.
      </p>

      <h2>Contact</h2>
      <p>
        For questions or deletion requests, reach me through{' '}
        <a href={GITHUB_PROFILE} className="font-medium text-brand underline underline-offset-2">
          my GitHub profile
        </a>
        .
      </p>
    </article>
  );
}
