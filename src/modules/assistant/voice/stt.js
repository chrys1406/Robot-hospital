/** Voz → texto (Web Speech API: SpeechRecognition). Funciona en Chrome/Edge. */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const sttSupported = !!SR;

export function createListener({ lang = 'es-419', onStart, onResult, onEnd, onError } = {}) {
  if (!SR) return null;

  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => onStart?.();
  rec.onresult = (e) => {
    let text = '';
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    onResult?.(text.trim(), isFinal);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();

  return {
    start: () => { try { rec.start(); } catch { /* ya estaba escuchando */ } },
    stop: () => rec.stop(),
  };
}
