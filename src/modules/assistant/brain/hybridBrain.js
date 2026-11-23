import { localReply } from './localRules.js';
import { groqChat, geminiChat } from './providers.js';
import { buildSystemPrompt } from './prompt.js';
import { getHospitalContext, formatContext } from '../data/hospitalData.js';

/**
 * Cadena: reglas locales (instantáneo) → Groq 70B → Groq 8B → Gemini → mensaje local.
 * Cada paso que falla pasa al siguiente. Los tiempos salen en la consola.
 */
export function createHybridBrain({
  groqKey,
  geminiKey,
  maxHistoryTurns = 6,
  attemptTimeoutMs = 3500,
  totalTimeoutMs = 9000,
} = {}) {
  const chain = [];
  if (groqKey) {
        chain.push({ name: 'groq-120b', run: (a) => groqChat({ ...a, apiKey: groqKey, model: 'openai/gpt-oss-120b' }) });
       chain.push({ name: 'groq-20b', run: (a) => groqChat({ ...a, apiKey: groqKey, model: 'openai/gpt-oss-20b' }) }); }
  if (geminiKey) {
    chain.push({ name: 'gemini-flash-lite', run: (a) => geminiChat({ ...a, apiKey: geminiKey, model: 'gemini-3.5-flash-lite' }) });
  }

  const history = [];
  const trimHistory = () => {
    const max = maxHistoryTurns * 2;
    if (history.length > max) history.splice(0, history.length - max);
  };

  async function ask(userText) {
    const text = (userText || '').trim();
    if (!text) return 'Por favor, escribe o di tu consulta.';

    const t0 = performance.now();

    const quick = localReply(text);
    if (quick) {
      console.info(`[brain] local ${Math.round(performance.now() - t0)} ms`);
      return quick;
    }

    const system = buildSystemPrompt(formatContext(await getHospitalContext()));
    const deadline = Date.now() + totalTimeoutMs;

    for (const provider of chain) {
      const remaining = deadline - Date.now();
      if (remaining < 700) break;
      try {
        const reply = await provider.run({
          system,
          history,
          userText: text,
          timeoutMs: Math.min(attemptTimeoutMs, remaining),
        });
        console.info(`[brain] ${provider.name} ${Math.round(performance.now() - t0)} ms`);
        history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
        trimHistory();
        return reply;
      } catch (err) {
        console.warn(`[brain] ${provider.name} falló:`, err?.status ?? err?.name, err?.message);
      }
    }

    return 'No pude consultar al asistente en este momento. Si es urgente, acércate a recepción o a emergencias.';
  }

  function resetHistory() {
    history.length = 0;
  }

  return { ask, resetHistory };
}