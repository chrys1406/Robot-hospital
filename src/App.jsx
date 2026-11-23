import { useEffect, useMemo, useRef, useState } from 'react';
import { AssistantRobot, AssistantPanel, useAssistant } from './modules/assistant';
import { createHybridBrain } from './modules/assistant/brain/hybridBrain.js';
import { createWhisperTranscriber } from './modules/assistant/voice/whisper.js';

const DEV_STATES = [
  ['reposo', '🕊️ Reposo'],
  ['saludo', '👋 Saludar'],
  ['escuchando', '👂 Escuchando'],
  ['hablando', '💬 Hablando'],
];

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function App() {
  const robotRef = useRef(null);
  const [forced, setForced] = useState('saludo');

  const brain = useMemo(
    () => createHybridBrain({ groqKey: GROQ_KEY, geminiKey: GEMINI_KEY }),
    []
  );

  const transcribe = useMemo(
    () =>
      GROQ_KEY
        ? createWhisperTranscriber({
            apiKey: GROQ_KEY,
            prompt: 'Consulta en un hospital: doctor, doctora, consultorio, piso, cita, emergencias, horario.',
          })
        : null,
    []
  );

  const assistant = useAssistant({
    autoSpeak: true,
    transcribe,
    respond: (input) => brain.ask(typeof input === 'string' ? input : ''),
  });

  useEffect(() => {
    if (assistant.phase !== 'reposo') setForced(null);
  }, [assistant.phase]);

  const robotState = forced ?? assistant.phase;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
      <header className="pointer-events-none absolute left-6 top-6 z-10">
        <h1 className="text-xl font-bold text-slate-800">ASISTENTE MÉDICO 3D</h1>
        <p className="text-sm text-slate-500">Cerebro: Groq + Whisper (respaldo Gemini)</p>
      </header>

      <AssistantRobot ref={robotRef} state={robotState} />

      <div className="absolute right-6 top-6 z-10">
        <AssistantPanel
          {...assistant}
          onListen={assistant.listen}
          onSendText={assistant.sendText}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur">
        {DEV_STATES.map(([name, label]) => (
          <button
            key={name}
            type="button"
            onClick={() => setForced(name)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              robotState === name
                ? 'bg-sky-500 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => robotRef.current?.blink()}
          className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-200"
        >
          😉 Parpadear
        </button>
      </div>
    </div>
  );
}