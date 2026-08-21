import * as SecureStore from 'expo-secure-store';

const USER_ID_KEY = 'tennis_analyzer_user_id';
const WEB_APP_URL_KEY = 'tennis_analyzer_web_app_url';
const ANALYSIS_MODE_KEY = 'tennis_analyzer_analysis_mode';

// AI Provider settings
const AI_PROVIDER_KEY = 'tennis_analyzer_ai_provider';
const ANTHROPIC_API_KEY = 'tennis_analyzer_anthropic_api_key';
const OPENAI_API_KEY = 'tennis_analyzer_openai_api_key';
const GEMINI_API_KEY = 'tennis_analyzer_gemini_api_key';
const OPENROUTER_API_KEY = 'tennis_analyzer_openrouter_api_key';

// Model overrides
const ANTHROPIC_MODEL_KEY = 'tennis_analyzer_anthropic_model';
const OPENAI_MODEL_KEY = 'tennis_analyzer_openai_model';
const GEMINI_MODEL_KEY = 'tennis_analyzer_gemini_model';
const OPENROUTER_MODEL_KEY = 'tennis_analyzer_openrouter_model';

// Valid analysis intelligence modes. 'hybrid' is the default.
export const ANALYSIS_MODES = ['deterministic', 'hybrid', 'llm'];
export const DEFAULT_ANALYSIS_MODE = 'hybrid';

export const AI_PROVIDERS = ['anthropic', 'openai', 'gemini', 'openrouter'];
export const DEFAULT_AI_PROVIDER = 'anthropic';

// Default model values — smallest/cheapest tier per provider. AI modes now
// only rephrase pre-computed data (see anthropic.js), so a large model buys
// nothing; a small, literal model is both cheaper and less prone to
// "helpfully" elaborating past what it was given. Users who explicitly pick a
// bigger model in Settings are unaffected.
export const DEFAULT_MODELS = {
  anthropic: 'claude-haiku-4-5',
  openai: 'o4-mini',
  gemini: 'gemini-3.1-flash-lite',
  openrouter: 'google/gemma-4-31b-it'
};

// Generate an 8-character hex user ID (e.g. "8fee48ab")
function generateRandomId() {
  return Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
}

const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwyZvgios_EUb_f12kQv1jCorSGfBsoyIp8gs3bVtFTWLBZZnTCxKHrcVRwgJaDPJfm7A/exec';

function normalizeAnalysisMode(mode) {
  return ANALYSIS_MODES.indexOf(mode) !== -1 ? mode : DEFAULT_ANALYSIS_MODE;
}

function normalizeAiProvider(provider) {
  return AI_PROVIDERS.indexOf(provider) !== -1 ? provider : DEFAULT_AI_PROVIDER;
}

export async function getSettings() {
  try {
    let userId = await SecureStore.getItemAsync(USER_ID_KEY);
    if (!userId) {
      userId = generateRandomId();
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
    }

    let webAppUrl = await SecureStore.getItemAsync(WEB_APP_URL_KEY);
    if (!webAppUrl) {
      webAppUrl = DEFAULT_WEB_APP_URL;
    }

    let analysisMode = normalizeAnalysisMode(await SecureStore.getItemAsync(ANALYSIS_MODE_KEY) || DEFAULT_ANALYSIS_MODE);
    let aiProvider = normalizeAiProvider(await SecureStore.getItemAsync(AI_PROVIDER_KEY) || DEFAULT_AI_PROVIDER);

    let anthropicApiKey = await SecureStore.getItemAsync(ANTHROPIC_API_KEY) || '';
    let openaiApiKey = await SecureStore.getItemAsync(OPENAI_API_KEY) || '';
    let geminiApiKey = await SecureStore.getItemAsync(GEMINI_API_KEY) || '';
    let openrouterApiKey = await SecureStore.getItemAsync(OPENROUTER_API_KEY) || '';

    let anthropicModel = await SecureStore.getItemAsync(ANTHROPIC_MODEL_KEY) || DEFAULT_MODELS.anthropic;
    let openaiModel = await SecureStore.getItemAsync(OPENAI_MODEL_KEY) || DEFAULT_MODELS.openai;
    let geminiModel = await SecureStore.getItemAsync(GEMINI_MODEL_KEY) || DEFAULT_MODELS.gemini;
    let openrouterModel = await SecureStore.getItemAsync(OPENROUTER_MODEL_KEY) || DEFAULT_MODELS.openrouter;

    return {
      userId,
      webAppUrl,
      analysisMode,
      aiProvider,
      anthropicApiKey,
      openaiApiKey,
      geminiApiKey,
      openrouterApiKey,
      anthropicModel,
      openaiModel,
      geminiModel,
      openrouterModel
    };
  } catch (error) {
    console.error('Error loading settings:', error);
    return {
      userId: generateRandomId(),
      webAppUrl: DEFAULT_WEB_APP_URL,
      analysisMode: DEFAULT_ANALYSIS_MODE,
      aiProvider: DEFAULT_AI_PROVIDER,
      anthropicApiKey: '',
      openaiApiKey: '',
      geminiApiKey: '',
      openrouterApiKey: '',
      anthropicModel: DEFAULT_MODELS.anthropic,
      openaiModel: DEFAULT_MODELS.openai,
      geminiModel: DEFAULT_MODELS.gemini,
      openrouterModel: DEFAULT_MODELS.openrouter
    };
  }
}

export async function saveSettings(settingsObj) {
  try {
    const fields = [
      [USER_ID_KEY, settingsObj.userId],
      [WEB_APP_URL_KEY, settingsObj.webAppUrl],
      [ANALYSIS_MODE_KEY, settingsObj.analysisMode !== undefined ? normalizeAnalysisMode(settingsObj.analysisMode) : undefined],
      [AI_PROVIDER_KEY, settingsObj.aiProvider !== undefined ? normalizeAiProvider(settingsObj.aiProvider) : undefined],
      [ANTHROPIC_API_KEY, settingsObj.anthropicApiKey],
      [OPENAI_API_KEY, settingsObj.openaiApiKey],
      [GEMINI_API_KEY, settingsObj.geminiApiKey],
      [OPENROUTER_API_KEY, settingsObj.openrouterApiKey],
      [ANTHROPIC_MODEL_KEY, settingsObj.anthropicModel],
      [OPENAI_MODEL_KEY, settingsObj.openaiModel],
      [GEMINI_MODEL_KEY, settingsObj.geminiModel],
      [OPENROUTER_MODEL_KEY, settingsObj.openrouterModel]
    ];

    for (const [key, val] of fields) {
      if (val !== undefined) {
        await SecureStore.setItemAsync(key, val);
      }
    }
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}
