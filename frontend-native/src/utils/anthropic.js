import { getSettings } from './settings';

const SYSTEM_PROMPT = [
  'You are an expert tennis performance analyst. Everything you are given below has',
  'already been fully computed and verified from point-by-point match charting for',
  'one player (the "subject") vs an opponent — pre-written diagnosis text,',
  'recommendations, and short narrative summaries per section. Nothing is raw or',
  'unprocessed.',
  '',
  'Strict rules:',
  '1. Your ONLY job is to rephrase the given data into clear, natural prose for a',
  '   player/coach audience. Do NOT calculate, estimate, derive, or introduce any',
  '   number, percentage, or count that is not already present in the given data.',
  '   This is the most important rule.',
  '2. Every number you write must be copied exactly as given — do not round',
  '   differently, recompute a percentage, or combine numbers into a new one.',
  '3. Do NOT invent stats, claims, or conclusions beyond what is given. Do NOT use',
  '   coaching platitudes or filler not grounded in the given data.',
  '4. Use the subject player\'s name (from the `subject` field) and opponent\'s',
  '   (from `opponent`).',
  '5. Format output as Markdown with ## headings per section.',
].join('\n');

// Low temperature: both LLM modes now only rephrase pre-computed, correct data
// (see synthesizeDiagnosis/writeFullReport below) — this is a literal rewriting
// task, not creative writing, so we want the least sampling variance possible.
const TEMPERATURE = 0.15;

async function callProvider(userPrompt) {
  const settings = await getSettings();
  const provider = settings.aiProvider || 'anthropic';

  let apiKey = '';
  let model = '';

  if (provider === 'anthropic') {
    apiKey = settings.anthropicApiKey;
    model = settings.anthropicModel || 'claude-haiku-4-5';
  } else if (provider === 'openai') {
    apiKey = settings.openaiApiKey;
    model = settings.openaiModel || 'o4-mini';
  } else if (provider === 'gemini') {
    apiKey = settings.geminiApiKey;
    model = settings.geminiModel || 'gemini-3.1-flash-lite';
  } else if (provider === 'openrouter') {
    apiKey = settings.openrouterApiKey;
    model = settings.openrouterModel || 'google/gemma-4-31b-it';
  }

  if (!apiKey) {
    throw new Error(`No API key set for ${provider.toUpperCase()}. Please configure it in Settings.`);
  }

  let response;
  try {
    if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4096,
          temperature: TEMPERATURE,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
    } else if (provider === 'openai' || provider === 'openrouter') {
      const endpoint = provider === 'openai' 
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      
      const isReasoning = model && /(^|\/)o\d/.test(model);
      const useCompletionTokens = model && (
        /(^|\/)o\d/.test(model) || 
        /gpt-5/.test(model) || 
        /r1/.test(model)
      );
      const requestBody = {
        model: model,
        messages: [
          { role: (isReasoning || /gpt-5/.test(model)) ? 'developer' : 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      };
      
      if (useCompletionTokens) {
        requestBody.max_completion_tokens = 4096;
      } else {
        requestBody.max_tokens = 4096;
      }
      // Reasoning models (o-series) reject a custom temperature — only their
      // default (1) is accepted, so skip it there.
      if (!isReasoning) {
        requestBody.temperature = TEMPERATURE;
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
    } else if (provider === 'gemini') {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { maxOutputTokens: 4096, temperature: TEMPERATURE }
        }),
      });
    }
  } catch (err) {
    throw new Error(`Network error contacting ${provider.toUpperCase()}: ${err.message}`);
  }

  if (response.status === 401) {
    throw new Error(`${provider.toUpperCase()} rejected the API key (401). Check the key in Settings.`);
  }
  if (response.status === 429) {
    throw new Error(`${provider.toUpperCase()} rate limit or quota exceeded (429).`);
  }
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error(`${provider.toUpperCase()} API error (${response.status}): ${txt.slice(0, 200)}`);
  }

  const json = await response.json();
  let text = '';

  if (provider === 'anthropic') {
    text = (json.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } else if (provider === 'openai' || provider === 'openrouter') {
    text = json.choices?.[0]?.message?.content || '';
  } else if (provider === 'gemini') {
    text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  text = text.trim();
  if (!text) {
    throw new Error(`${provider.toUpperCase()} returned an empty response.`);
  }
  return text;
}

// Hybrid mode: structured Q1–Q6 are rendered deterministically by the app;
// AI rephrases the already-correct diagnosis (Q7) and recommendations (Q8).
// Only the pre-computed Q7/Q8 data is sent — no raw counters — so the model
// has nothing to (mis)calculate from; it can only reword what's given.
export async function synthesizeDiagnosis(insights, apiKeyIgnored) {
  const prompt = [
    'Rephrase the pre-computed diagnosis and recommendations below into natural',
    'prose, as ## Why the subject won or lost (Q7) and ## Recommendations (Q8).',
    'Every number, label, and conclusion below has already been computed and',
    'verified — your only job is to turn it into readable prose. Do not calculate,',
    'estimate, or introduce any number that is not already present below.',
    '',
    'Subject:', insights.subject,
    'Opponent:', insights.opponent,
    '',
    'Q7 diagnosis (pre-computed):',
    '```json',
    JSON.stringify(insights.q7_diagnosis, null, 2),
    '```',
    '',
    'Q8 recommendations (pre-computed):',
    '```json',
    JSON.stringify(insights.q8_recommendations, null, 2),
    '```',
  ].join('\n');
  return callProvider(prompt);
}

// LLM mode: AI writes the full narrative report, but — same as hybrid — only
// rephrases pre-computed per-section prose (q1_narrative..q6_narrative) and
// the Q7/Q8 data. No raw counters are ever sent, so there's nothing for the
// model to recompute across any of the 8 sections.
export async function writeFullReport(insights, apiKeyIgnored) {
  const prompt = [
    'Rephrase the pre-computed match analysis below into natural prose, as these',
    'Markdown sections in order:',
    '## 1. Serve Patterns',
    '## 2. Serve Strengths & Weaknesses',
    '## 3. Baseline Strengths & Weaknesses',
    '## 4. Net Game',
    '## 5. Momentum & Consistency',
    '## 6. Clutch Performance',
    '## 7. Why the Subject Won or Lost',
    '## 8. Recommendations',
    '',
    'Every number, label, and conclusion below has already been computed and',
    'verified — your only job is to turn each pre-computed section into readable',
    'prose. Do not calculate, estimate, or introduce any number that is not',
    'already present below.',
    '',
    'Subject:', insights.subject,
    'Opponent:', insights.opponent,
    '',
    '1. Serve patterns (pre-computed):', insights.q1_narrative,
    '2. Serve strengths/weaknesses (pre-computed):', insights.q2_narrative,
    '3. Baseline strengths/weaknesses (pre-computed):', insights.q3_narrative,
    '4. Net game (pre-computed):', insights.q4_narrative,
    '5. Momentum & consistency (pre-computed):', insights.q5_narrative,
    '6. Clutch performance (pre-computed):', insights.q6_narrative,
    '',
    '7. Diagnosis (pre-computed):',
    '```json',
    JSON.stringify(insights.q7_diagnosis, null, 2),
    '```',
    '8. Recommendations (pre-computed):',
    '```json',
    JSON.stringify(insights.q8_recommendations, null, 2),
    '```',
  ].join('\n');
  return callProvider(prompt);
}

// ─── Numeric-citation validation ─────────────────────────────────────────────
// Since both modes above now send only pre-computed data (no raw counters),
// any number the model outputs should be traceable verbatim to what it was
// given. This builds the exact source text sent for a mode, and checks every
// "N of M" / "N/M" / "N%" citation in the LLM output appears in that source.
export function buildSourceText(insights, mode) {
  if (mode === 'llm') {
    return [
      insights.q1_narrative, insights.q2_narrative, insights.q3_narrative,
      insights.q4_narrative, insights.q5_narrative, insights.q6_narrative,
      JSON.stringify(insights.q7_diagnosis), JSON.stringify(insights.q8_recommendations),
    ].join('\n');
  }
  return [
    JSON.stringify(insights.q7_diagnosis), JSON.stringify(insights.q8_recommendations),
  ].join('\n');
}

const CITATION_RE = /\d+(?:\.\d+)?\s*(?:of|\/)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*%/g;

function citationInSource(citation, sourceText) {
  if (sourceText.indexOf(citation) !== -1) return true;
  const ofMatch = citation.match(/^(\d+(?:\.\d+)?)\s*of\s*(\d+(?:\.\d+)?)$/);
  if (ofMatch && sourceText.indexOf(`${ofMatch[1]}/${ofMatch[2]}`) !== -1) return true;
  const slashMatch = citation.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (slashMatch && sourceText.indexOf(`${slashMatch[1]} of ${slashMatch[2]}`) !== -1) return true;
  return false;
}

// Returns true if every numeric citation in llmText traces back to sourceText.
export function validateNumericCitations(llmText, sourceText) {
  const citations = (llmText || '').match(CITATION_RE) || [];
  return citations.every((c) => citationInSource(c.replace(/\s+/g, ' ').trim(), sourceText));
}
