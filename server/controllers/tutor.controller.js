import { env } from '../config/env.js';
import * as tutorService from '../services/tutor.service.js';
import { ApiError } from '../utils/ApiError.js';

const getUserId = (req) => req.user.sub;

/** GET /api/lessons/:id/tutor  → the saved conversation */
export async function getTutorChat(req, res) {
  const messages = await tutorService.getChat(getUserId(req), req.params.id);
  res.json({ messages });
}

/** DELETE /api/lessons/:id/tutor  → clears the conversation */
export async function clearTutorChat(req, res) {
  await tutorService.clearChat(getUserId(req), req.params.id);
  res.status(204).end();
}

/** The message a learner may see for an error that happens mid-stream. */
function streamErrorBody(error) {
  if (error instanceof ApiError) return { message: error.message, code: error.code };
  console.error('💥 tutor stream failed:', error);
  return {
    message: env.isProduction ? 'Something went wrong on our side. Please try again.' : error.message,
  };
}

/**
 * POST /api/lessons/:id/tutor   body: { question }
 *
 * Streams the answer as NDJSON (newline-delimited JSON): one small JSON object per line,
 * sent as soon as it exists.
 *
 *   {"type":"delta","text":"Hooks let "}
 *   {"type":"delta","text":"function components..."}
 *   {"type":"done","messages":[{...question},{...answer}]}     (both saved by then)
 *   or {"type":"error","error":{"message":"..."}}
 *
 * Why not Server-Sent Events (EventSource)? EventSource can only make GET requests and
 * can't send an Authorization header; NDJSON over a normal POST has neither limit.
 */
export async function askTutor(req, res) {
  // If the learner leaves mid-answer, stop generating (and paying for) an answer nobody reads.
  // `res` 'close' fires when the connection ends; writableFinished tells a normal end apart.
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) abort.abort();
  });

  const { answer, save } = await tutorService.askTutor(getUserId(req), req.params.id, req.body.question, {
    signal: abort.signal,
  });

  // Wait for the first piece BEFORE sending the 200 header: an error up to this point
  // (AI rate limit, AI down, blocked question) still becomes a normal JSON error response
  // with the right status code (thrown errors go to the error handler as usual).
  const pieces = answer[Symbol.asyncIterator]();
  let piece = await pieces.next();
  if (abort.signal.aborted) return;

  res.status(200).set({
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform', // proxies must not buffer or compress the stream
    'X-Accel-Buffering': 'no', // same, for nginx-style proxies
  });
  res.flushHeaders();
  const send = (event) => {
    if (!abort.signal.aborted) res.write(`${JSON.stringify(event)}\n`); // nobody is listening any more
  };

  // From here the status is already 200, so errors are reported inside the stream.
  try {
    let fullAnswer = '';
    while (!piece.done) {
      fullAnswer += piece.value;
      send({ type: 'delta', text: piece.value });
      piece = await pieces.next();
    }
    if (abort.signal.aborted) return; // learner left: nothing to save

    const messages = await save(fullAnswer);
    send({ type: 'done', messages });
  } catch (error) {
    send({ type: 'error', error: streamErrorBody(error) });
  } finally {
    res.end();
  }
}
