import { useMemo, useRef, useState } from 'react';
import { AssistantRobot, ChatBar, RobotBubble, useAssistant, useRobotMood } from './modules/assistant';
import { createHybridBrain } from './modules/assistant/brain/hybridBrain.js';
import { createWhisperTranscriber } from './modules/assistant/voice/whisper.js';

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function App() {
  const robotRef = useRef(null);
  const noticeTimer = useRef(0);
  const [typing, setTyping] = useState(false);
  const [notice, setNotice] = useState('');

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

  const { robotState, thinking } = useRobotMood({ assistant, typing, robotRef });

  const showNotice = (msg) => {
    clearTimeout(noticeTimer.current);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  };

  const handleSend = ({ text, photo }) => {
    if (photo) showNotice('Foto recibida. El análisis de imágenes todavía no está conectado.');
    if (text) assistant.sendText(text);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-sky-50 via-white to-slate-100">
      <header className="pointer-events-none absolute left-6 top-6 z-10 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg">
          ✚
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-slate-800">Asistente Médico</h1>
          <p className="text-xs text-slate-500">Orientación y atención</p>
        </div>
      </header>

      <AssistantRobot ref={robotRef} state={robotState} />

      <RobotBubble thinking={thinking} text={assistant.botText} />

      <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2 px-4">
        {assistant.error && (
          <p className="rounded-full bg-red-50 px-4 py-1 text-xs font-medium text-red-600 shadow">
            {assistant.error}
          </p>
        )}
        {notice && (
          <p className="rounded-full bg-amber-50 px-4 py-1 text-xs font-medium text-amber-700 shadow">
            {notice}
          </p>
        )}
        {assistant.userText && (
          <p className="max-w-md truncate rounded-full bg-white/80 px-4 py-1 text-xs text-slate-500 shadow">
            Tú: {assistant.userText}
          </p>
        )}

        <ChatBar
          onSend={handleSend}
          onToggleRecord={assistant.listen}
          isRecording={assistant.isRecording}
          micSupported={assistant.supported}
          busy={thinking || assistant.phase === 'hablando'}
          onTypingChange={setTyping}
        />
      </div>
    </div>
  );
}