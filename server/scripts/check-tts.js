/**
 * Smoke test for Gemini text-to-speech:   npm run check:tts
 *
 * Records one short Hinglish sentence with GEMINI_TTS_MODEL / GEMINI_TTS_VOICE, encodes it to
 * MP3 and saves it to your temp folder so you can listen to it. Uses 1 TTS request.
 */
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '../config/env.js';
import { synthesizeSpeech } from '../services/tts.service.js';
import { pcmDurationSeconds, pcmToMp3 } from '../utils/audio.js';

if (!env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set. Add it to server/.env (see .env.example).');
  process.exit(1);
}

const text = 'नमस्ते! आज हम React के useEffect hook के बारे में सीखेंगे। यह side effects handle करने का सबसे आसान तरीका है।';
console.log(`🔎 Testing "${env.GEMINI_TTS_MODEL}" with voice "${env.GEMINI_TTS_VOICE}"...`);

try {
  const startedAt = Date.now();
  const { pcm, sampleRate } = await synthesizeSpeech(text);
  const mp3 = pcmToMp3(pcm, sampleRate);
  const file = join(tmpdir(), 'edify-tts-check.mp3');
  writeFileSync(file, mp3);
  console.log(`✅ Works! ${pcmDurationSeconds(pcm, sampleRate)}s of audio in ${Date.now() - startedAt}ms`);
  console.log(`   ${Math.round(pcm.length / 1024)} KB raw → ${Math.round(mp3.length / 1024)} KB MP3: ${file}`);
} catch (error) {
  console.error(`❌ TTS failed: ${error.code ?? ''} ${error.message}`);
  process.exit(1);
}
