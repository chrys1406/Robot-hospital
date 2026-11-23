async function postJson(url, { headers, body, timeoutMs }) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(err?.error?.message || `HTTP ${res.status}`);
      e.status = res.status;
      throw e;
    }
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

function emptyError(detail = '') {
  const e = new Error(`Respuesta vacía ${detail}`.trim());
  e.status = 0;
  return e;
}

/** history: [{ role: 'user' | 'assistant', content }] */
export async function groqChat({ apiKey, model, system, history, userText, timeoutMs = 3500 }) {
  const isReasoning = model.startsWith('openai/gpt-oss');

  const data = await postJson('https://api.groq.com/openai/v1/chat/completions', {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeoutMs,
    body: {
      model,
      temperature: 0.4,
      // En modelos de razonamiento este tope incluye el "pensamiento", por eso es amplio.
      // La brevedad de la respuesta la controla el prompt.
      max_completion_tokens: 800,
      ...(isReasoning && { reasoning_effort: 'low', include_reasoning: false }),
      messages: [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: userText },
      ],
    },
  });
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw emptyError();
  return text;
}

export async function geminiChat({ apiKey, model, system, history, userText, timeoutMs = 5000 }) {
  const contents = [...history, { role: 'user', content: userText }].map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      headers: { 'x-goog-api-key': apiKey },
      timeoutMs,
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingLevel: 'low' },
        },
      },
    }
  );
  const cand = data?.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text || '').join('').trim();
  if (!text) throw emptyError(`(finishReason: ${cand?.finishReason ?? 'desconocido'})`);
  return text;
}