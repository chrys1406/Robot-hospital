const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';

export function createWhisperTranscriber({
  apiKey,
  model = 'whisper-large-v3-turbo',
  language = 'es',
  prompt = '',
  timeoutMs = 6000,
} = {}) {
  return async function transcribe(blob) {
    const t0 = performance.now();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';

    const form = new FormData();
    form.append('file', blob, `audio.${ext}`);
    form.append('model', model);
    form.append('language', language);
    form.append('response_format', 'json');
    form.append('temperature', '0');
    if (prompt) form.append('prompt', prompt);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` }, // sin Content-Type: el navegador lo pone con FormData
        body: form,
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Whisper HTTP ${res.status}`);
      }
      const data = await res.json();
      const text = (data?.text || '').trim();
      console.info(`[whisper] ${Math.round(performance.now() - t0)} ms → "${text}"`);
      return text;
    } finally {
      clearTimeout(id);
    }
  };
}