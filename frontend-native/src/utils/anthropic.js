import { getSettings } from './settings';

const SYSTEM_PROMPT = [
  'You are an expert tennis performance analyst. You are given a structured JSON',
  'object of match statistics computed from point-by-point charting data for one',
  'player (the "subject") vs an opponent. The JSON covers: serve patterns by',
  'scenario (deuce/ad, 1st/2nd serve, high-pressure, game-point), serve strengths',
  'and weaknesses, baseline strengths/weaknesses (unforced errors & winners by',
  'shot), net game, a per-4-game time-series with set markers, and clutch /',
  'high-pressure performance.',
  '',
  'Strict rules:',
  '1. Only draw a conclusion when the underlying numbers support it. Every',
  '   structured field carries an `sufficient` flag and a sample size `n`. If',
  '   `sufficient` is false or n is small, say "Insufficient data (n=…)" and do',
  '   NOT guess. This is the most important rule.',
  '2. Cite the numbers that justify each conclusion (percentages, counts, sample',
  '   sizes). Be concrete, not generic.',
  '3. Do NOT invent stats that are not in the JSON. Do NOT use coaching platitudes',
  '   or filler. Every recommendation must trace to a measured weakness.',
  '4. Write in clear prose for a player/coach audience. Use the subject player\'s',
  '   name (from the `subject` field) and opponent\'s (from `opponent`).',
  '5. Format output as Markdown with ## headings per section.',
].join('\n');

async function callProvider(userPrompt) {
  const settings = await getSettings();
  const provider = settings.aiProvider || 'anthropic';
  
  let apiKey = '';
  let model = '';
  
  if (provider === 'anthropic') {
    apiKey = settings.anthropicApiKey;
    model = settings.anthropicModel || 'claude-fable-5';
  } else if (provider === 'openai') {
    apiKey = settings.openaiApiKey;
    model = settings.openaiModel || 'gpt-5.6-sol';
  } else if (provider === 'gemini') {
    apiKey = settings.geminiApiKey;
    model = settings.geminiModel || 'gemini-3.5-flash';
  } else if (provider === 'openrouter') {
    apiKey = settings.openrouterApiKey;
    model = settings.openrouterModel || 'deepseek/deepseek-v4-pro';
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
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
    } else if (provider === 'openai' || provider === 'openrouter') {
      const endpoint = provider === 'openai' 
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      
      const isReasoning = model && /(^|\/)o\d/.test(model);
      const requestBody = {
        model: model,
        messages: [
          { role: isReasoning ? 'developer' : 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      };
      
      if (isReasoning) {
        requestBody.max_completion_tokens = 4096;
      } else {
        requestBody.max_tokens = 4096;
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
          generationConfig: { maxOutputTokens: 4096 }
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
// AI writes only the diagnosis (Q7) and recommendations (Q8).
export async function synthesizeDiagnosis(insights, apiKeyIgnored) {
  const prompt = [
    'Write sections ## Why the subject won or lost (Q7) and ## Recommendations (Q8)',
    'for the player below. The structured stats for Q1–Q6 are already shown to the',
    'user separately, so focus only on Q7 (a data-grounded explanation of the',
    'result — point balance, break-point conversion, serve dominance, error',
    'management, clutch performance) and Q8 (specific training recommendations,',
    'each tied to a measured weakness). Honor `sufficient` flags strictly.',
    '',
    'Subject:', insights.subject,
    'Opponent:', insights.opponent,
    'Total points:', insights.totalPoints,
    'Points won (subject-opponent):', `${insights.pointsWon.subject}-${insights.pointsWon.opponent}`,
    '',
    'Structured insights JSON:',
    '```json',
    JSON.stringify(insights, null, 2),
    '```',
  ].join('\n');
  return callProvider(prompt);
}

// LLM mode: AI writes the entire narrative report across all 8 questions.
export async function writeFullReport(insights, apiKeyIgnored) {
  const prompt = [
    'Write the full match analysis report for the player below, with these Markdown',
    'sections in order:',
    '## 1. Serve Patterns  (Q1 — patterns by deuce/ad, 1st/2nd, high-pressure,',
    'game-point; cite dominant directions and %)',
    '## 2. Serve Strengths & Weaknesses  (Q2)',
    '## 3. Baseline Strengths & Weaknesses  (Q3 — forehand/backhand etc.)',
    '## 4. Net Game  (Q4)',
    '## 5. Momentum & Consistency  (Q5 — time-series, better/worse stretches)',
    '## 6. Clutch Performance  (Q6 — high-pressure, break/game point conversion)',
    '## 7. Why the Subject Won or Lost  (Q7)',
    '## 8. Recommendations  (Q8 — training, tied to measured weaknesses)',
    '',
    'Honor `sufficient` flags strictly: where a stat is insufficient, say so and',
    'do not guess. Cite numbers. Be specific, not generic.',
    '',
    'Subject:', insights.subject,
    'Opponent:', insights.opponent,
    'Total points:', insights.totalPoints,
    'Points won (subject-opponent):', `${insights.pointsWon.subject}-${insights.pointsWon.opponent}`,
    '',
    'Structured insights JSON:',
    '```json',
    JSON.stringify(insights, null, 2),
    '```',
  ].join('\n');
  return callProvider(prompt);
}
