import * as SecureStore from 'expo-secure-store';

const USER_ID_KEY = 'tennis_analyzer_user_id';
const WEB_APP_URL_KEY = 'tennis_analyzer_web_app_url';

// Generate an 8-character hex user ID (e.g. "8fee48ab")
function generateRandomId() {
  return Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
}

// ─── DEVELOPER CONFIG ────────────────────────────────────────────────────────
// Paste your deployed Google Apps Script Web App URL below (once, at build time).
// This is never shown to or configurable by end users.
const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwyZvgios_EUb_f12kQv1jCorSGfBsoyIp8gs3bVtFTWLBZZnTCxKHrcVRwgJaDPJfm7A/exec';

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
    
    return { userId, webAppUrl };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { userId: generateRandomId(), webAppUrl: DEFAULT_WEB_APP_URL };
  }
}

export async function saveSettings({ userId, webAppUrl }) {
  try {
    if (userId) {
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
    }
    if (webAppUrl !== undefined) {
      await SecureStore.setItemAsync(WEB_APP_URL_KEY, webAppUrl);
    }
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}
