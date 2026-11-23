const SYSTEM_INSTRUCTION = `
Eres el asistente virtual inteligente de orientación y atención de un hospital.
Tu función es recibir a pacientes y visitantes, orientarlos sobre áreas, horarios, citas, trámites o cómo acudir a emergencias, y responder con empatía y claridad.
Reglas importantes:
- Nunca des diagnósticos médicos definitivos ni reemplaces a un profesional de salud.
- Si el usuario menciona síntomas graves o urgencias médicas, indícale de inmediato que acuda al área de emergencias o solicite ayuda presencial.
- Responde de forma cordial, directa y concisa (idealmente 2 a 4 oraciones).
`.trim();

const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function quickFallbackReply(text = '') {
  const t = norm(text);
  if (/(emergencia|urgencia|grave|no puedo respirar|sangrado|desmayo)/.test(t)) {
    return 'Si es una emergencia médica, acude de inmediato al área de emergencias o solicita ayuda en recepción ahora mismo.';
  }
  if (/(cita|agendar|reservar|turno)/.test(t)) {
    return 'Para agendar una cita, indícame la especialidad que necesitas y acércate o consulta en ventanilla de admisión.';
  }
  if (/(horario|atienden|abierto|hora)/.test(t)) {
    return 'El área de emergencias atiende de forma continua; para consultorios externos, consulta en recepción los horarios vigentes.';
  }
  if (/(hola|buenas|buenos dias|buenas tardes|buenas noches)/.test(t)) {
    return 'Hola, soy tu asistente del hospital. ¿En qué puedo orientarte hoy?';
  }
  return 'En este momento el servicio de inteligencia artificial está saturado. Por favor, indícame si buscas emergencias, citas o información de algún área para orientarte.';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchGeminiWithTimeout({ url, payload, timeoutMs = 2400 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createGeminiBrain({
  apiKey,
  model = 'gemini-3.8-flash',
  maxHistoryTurns = 8,
  timeoutMs = 2400,
} = {}) {
  if (!apiKey) {
    throw new Error('Falta la API Key de Gemini.');
  }

  const history = [];

  const trimHistory = () => {
    const maxItems = maxHistoryTurns * 2;
    if (history.length > maxItems) {
      history.splice(0, history.length - maxItems);
    }
  };

  async function ask({ text = '', audioBlob = null } = {}) {
    const cleanText = (text || '').trim();
    if (!cleanText && !audioBlob) {
      return 'Por favor, escribe tu consulta o envía un mensaje de voz.';
    }

    const userParts = [];
    if (cleanText) {
      userParts.push({ text: cleanText });
    }
    if (audioBlob) {
      const base64Data = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || 'audio/webm';
      userParts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
      if (!cleanText) {
        userParts.push({
          text: 'Escucha este audio del usuario en el hospital y responde a su consulta.',
        });
      }
    }

    const contents = [
      ...history,
      { role: 'user', parts: userParts },
    ];

    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 200,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let reply = '';

    try {
      const response = await fetchGeminiWithTimeout({ url, payload, timeoutMs });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `Error HTTP ${response.status}`;
        console.warn('[GeminiBrain]:', msg);
        return quickFallbackReply(cleanText);
      }

      const data = await response.json();
      reply =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim() || '';
    } catch (err) {
      console.warn('[GeminiBrain timeout/error]:', err?.name || err);
      return quickFallbackReply(cleanText);
    }

    if (!reply) {
      return quickFallbackReply(cleanText);
    }

    const recordedUserParts = [];
    if (cleanText) recordedUserParts.push({ text: cleanText });
    if (audioBlob) {
      recordedUserParts.push({
        text: cleanText ? '[Audio adjunto]' : '[Mensaje de voz del usuario]',
      });
    }

    history.push({ role: 'user', parts: recordedUserParts });
    history.push({ role: 'model', parts: [{ text: reply }] });
    trimHistory();

    return reply;
  }

  function resetHistory() {
    history.length = 0;
  }

  return { ask, resetHistory };
}