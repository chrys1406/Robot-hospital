const required = (name) => {
  const v = process.env[name]
  if (!v) throw new Error(`Falta la variable de entorno ${name}`)
  return v
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  geminiKey: required('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
  groqKey: process.env.GROQ_API_KEY || null,
  groqChatModel: process.env.GROQ_CHAT_MODEL ?? 'openai/gpt-oss-120b',
  whisperModel: process.env.WHISPER_MODEL ?? 'whisper-large-v3-turbo',
  centerId: process.env.CENTER_ID ?? '00000000-0000-4000-8000-000000000001',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
}