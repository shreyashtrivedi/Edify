/**
 * Text-to-speech with Gemini (used for the Hinglish narration).
 *
 * Gemini TTS models take text and return audio instead of text: we ask for the AUDIO
 * response modality and pick one of the prebuilt voices. The model also follows short
 * natural-language style directions ("in a warm, friendly voice"), which we put first.
 */
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { mockTonePcm, sampleRateFromMime } from '../utils/audio.js';
import { getClient, toApiError } from './gemini.service.js';

const STYLE_DIRECTION =
  'Read the following aloud like a warm, friendly Indian teacher explaining to one student, at a relaxed, clear pace:';

/**
 * @param {string} text  what to say
 * @returns {Promise<{ pcm: Buffer, sampleRate: number }>} raw 16-bit mono PCM
 */
export async function synthesizeSpeech(text) {
  if (env.AI_MOCK) return { pcm: mockTonePcm(), sampleRate: 24000 };

  const startedAt = Date.now();
  let response;
  try {
    response = await getClient().models.generateContent({
      model: env.GEMINI_TTS_MODEL,
      contents: [{ parts: [{ text: `${STYLE_DIRECTION}\n\n${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE } } },
        // SDK v3 talks to the stable "v1" API by default, but speech output is only in "v1beta"
        // (v1 answers 400 "Unknown name speechConfig"). Override the version for this call only.
        httpOptions: { apiVersion: 'v1beta' },
      },
    });
  } catch (error) {
    throw toApiError(error);
  }

  const audio = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!audio?.data) {
    console.warn('🔊 TTS returned no audio. finishReason:', response.candidates?.[0]?.finishReason);
    throw ApiError.badGateway('The AI could not record the narration. Please try again.', {
      code: 'AI_NO_AUDIO',
    });
  }

  const pcm = Buffer.from(audio.data, 'base64');
  const sampleRate = sampleRateFromMime(audio.mimeType);
  console.log(`🔊 TTS: ${Math.round(pcm.length / 2 / sampleRate)}s of audio in ${Date.now() - startedAt}ms`);
  return { pcm, sampleRate };
}
