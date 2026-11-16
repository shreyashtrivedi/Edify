import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, isCancelled, tutorApi } from '../utils/api';

/**
 * State for the "ask a doubt" chat of one lesson.
 *
 * - The saved conversation is loaded on demand (when the chat is first opened), not on
 *   every lesson visit.
 * - Asking is optimistic: the question and an empty answer appear immediately, the answer
 *   fills in as it streams, and both are then swapped for the saved messages from the server.
 * - Leaving the lesson aborts a running answer, so the server stops the AI too.
 */
export function useTutor(lessonId) {
  const [messages, setMessages] = useState([]);
  const [loadStatus, setLoadStatus] = useState('idle'); // idle | loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null); // { message, retryQuestion? }
  const [announcement, setAnnouncement] = useState(''); // for screen readers
  const running = useRef(null); // AbortController of the answer being streamed

  useEffect(() => () => running.current?.abort(), []);

  const load = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError(null);
    try {
      setMessages(await tutorApi.chat(lessonId));
      setLoadStatus('ready');
    } catch (loadFailure) {
      setLoadError(getErrorMessage(loadFailure));
      setLoadStatus('error');
    }
  }, [lessonId]);

  const ask = useCallback(
    async (rawQuestion) => {
      const question = rawQuestion.trim();
      if (!question || running.current) return; // one answer at a time

      const controller = new AbortController();
      running.current = controller;
      const pendingQuestion = {
        _id: `pending-question-${Date.now()}`,
        role: 'user',
        text: question,
      };
      const pendingAnswer = {
        _id: `pending-answer-${Date.now()}`,
        role: 'tutor',
        text: '',
        streaming: true,
      };
      const withoutPending = (list) =>
        list.filter((m) => m._id !== pendingQuestion._id && m._id !== pendingAnswer._id);

      setError(null);
      setAsking(true);
      setAnnouncement('The tutor is writing an answer…');
      setMessages((current) => [...current, pendingQuestion, pendingAnswer]);

      try {
        const saved = await tutorApi.ask(lessonId, question, {
          signal: controller.signal,
          onDelta: (piece) =>
            setMessages((current) =>
              current.map((m) =>
                m._id === pendingAnswer._id ? { ...m, text: m.text + piece } : m,
              ),
            ),
        });
        setMessages((current) => [...withoutPending(current), ...saved]);
        setAnnouncement('The tutor answered.');
      } catch (askFailure) {
        if (isCancelled(askFailure)) return; // left the lesson: nothing to show
        setMessages(withoutPending);
        setError({ message: getErrorMessage(askFailure), retryQuestion: question });
        setAnnouncement('');
      } finally {
        if (running.current === controller) {
          running.current = null;
          setAsking(false);
        }
      }
    },
    [lessonId],
  );

  const clear = useCallback(async () => {
    setError(null);
    try {
      await tutorApi.clear(lessonId);
      setMessages([]);
    } catch (clearFailure) {
      setError({ message: getErrorMessage(clearFailure) });
    }
  }, [lessonId]);

  return { messages, loadStatus, loadError, load, ask, asking, clear, error, announcement };
}
