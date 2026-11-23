const SYSTEM_INSTRUCTION = `
Eres el asistente virtual inteligente de orientación y atención de un hospital.
Tu función es recibir a pacientes y visitantes, orientarlos sobre áreas, horarios, citas, trámites o cómo acudir a emergencias, y responder con empatía y claridad.
Reglas importantes:
- Nunca des diagnósticos médicos definitivos ni reemplaces a un profesional de salud.
- Si el usuario menciona síntomas graves o urgencias médicas, indícale de inmediato que acuda al área de emergencias o solicite ayuda presencial.
- Responde de forma cordial, directa y concisa (idealmente 2 a 4 oraciones).
`.trim();

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

export function createGeminiBrain({
  apiKey,
  model = 'gemini-3.8-flash',
  maxHistoryTurns = 10,
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 280,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `Error HTTP ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || 'No pude generar una respuesta en este momento.';

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