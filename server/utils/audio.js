/**
 * Audio helpers for the narration feature.
 *
 * Gemini's text-to-speech returns raw PCM: uncompressed 16-bit samples, 24,000 per second,
 * one channel (mime type "audio/L16;codec=pcm;rate=24000"). A minute of that is ~2.7 MB.
 * We encode it to MP3 at 48 kbps (plenty for a single voice), which is ~350 KB per minute:
 * about 8x smaller to store in MongoDB and to download on a phone.
 */
import { Mp3Encoder } from '@breezystack/lamejs';

const MP3_KBPS = 48;
const SAMPLES_PER_FRAME = 1152; // MP3 encodes audio in frames of 1152 samples

/** "audio/L16;codec=pcm;rate=24000" → 24000 (Gemini's default if missing). */
export function sampleRateFromMime(mimeType = '') {
  const match = /rate=(\d+)/.exec(mimeType);
  return match ? Number(match[1]) : 24000;
}

/** Duration of 16-bit mono PCM in seconds. */
export const pcmDurationSeconds = (pcm, sampleRate) => Math.round(pcm.length / 2 / sampleRate);

/** 16-bit little-endian mono PCM Buffer → MP3 Buffer. */
export function pcmToMp3(pcm, sampleRate) {
  // View the bytes as 16-bit samples without copying them
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);

  const chunks = [];
  for (let i = 0; i < samples.length; i += SAMPLES_PER_FRAME) {
    const chunk = encoder.encodeBuffer(samples.subarray(i, i + SAMPLES_PER_FRAME));
    if (chunk.length) chunks.push(Buffer.from(chunk));
  }
  chunks.push(Buffer.from(encoder.flush()));
  return Buffer.concat(chunks);
}

/** A soft 1.5 s tone with fade in/out, used as the narration "audio" in AI_MOCK mode. */
export function mockTonePcm(sampleRate = 24000) {
  const length = Math.round(sampleRate * 1.5);
  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const fade = Math.min(1, i / 2400, (length - i) / 2400);
    samples[i] = Math.round(4000 * fade * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
  }
  return Buffer.from(samples.buffer);
}
