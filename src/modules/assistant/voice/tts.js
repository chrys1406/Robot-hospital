/** Texto → voz (Web Speech API: speechSynthesis). */
let voices = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickSpanishVoice(lang) {
  return (
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es')) ||
    null
  );
}

export const ttsSupported = 'speechSynthesis' in window;

export function speak(text, { lang = 'es-419', rate = 1, pitch = 1.05, onStart, onEnd } = {}) {
  if (!ttsSupported) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  const voice = pickSpanishVoice(lang);
  if (voice) u.voice = voice;
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel();
}
