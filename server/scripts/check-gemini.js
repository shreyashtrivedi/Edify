/**
 * Smoke test for the Gemini setup:   npm run check:ai
 *
 * 1. Sends a tiny structured-JSON request using GEMINI_API_KEY + GEMINI_MODEL from .env.
 * 2. If that fails, lists the models your key can use so you can pick another one.
 */
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { toGeminiSchema } from '../services/gemini.service.js';
import { courseOutlineSchema } from '../schemas/course.schemas.js';

if (!env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set. Add it to server/.env (see .env.example).');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
console.log(`🔎 Testing model "${env.GEMINI_MODEL}" with a structured course-outline request...`);

try {
  const startedAt = Date.now();
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: 'Create a tiny 3-module course outline about "Photosynthesis" for beginners.',
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: toGeminiSchema(courseOutlineSchema),
    },
  });

  const outline = courseOutlineSchema.parse(JSON.parse(response.text));
  console.log(`✅ Works! ${Date.now() - startedAt}ms, ${response.usageMetadata?.totalTokenCount} tokens`);
  console.log(`   "${outline.title}": ${outline.modules.length} modules`);
} catch (error) {
  console.error(`❌ Request failed: ${error.status ?? ''} ${error.message}`);
  try {
    console.log('\nModels available to your key that support generateContent:');
    for await (const model of await ai.models.list()) {
      if (model.supportedActions?.includes('generateContent')) console.log(`  - ${model.name}`);
    }
    console.log('\nSet GEMINI_MODEL in server/.env to one of these (without the "models/" prefix).');
  } catch {
    console.log('(Could not list models. Check that the API key is valid.)');
  }
  process.exit(1);
}
