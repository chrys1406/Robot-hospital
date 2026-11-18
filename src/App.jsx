import { useEffect, useRef, useState } from 'react';
import { AssistantRobot, AssistantPanel, useAssistant } from './modules/assistant';

const DEV_STATES = [
  ['reposo', '🕊️ Reposo'],
  ['saludo', '👋 Saludar'],
  ['escuchando', '👂 Escuchando'],
  ['hablando', '💬 Hablando'],
];

// App de desarrollo: sirve para probar el robot solo.
// Cuando lo conectes al sistema, este archivo se reemplaza por el App del sistema.
export default function App() {
  const robotRef = useRef(null);
  const assistant = useAssistant();
  const [forced, setForced] = useState('saludo'); // pose manual de prueba

  // En cuanto hay actividad de voz, manda la voz y no la pose manual
  useEffect(() => {
    if (assistant.phase !== 'reposo') setForced(null);
  }, [assistant.phase]);

  const robotState = forced ?? assistant.phase;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
      <header className="pointer-events-none absolute left-6 top-6 z-10">
        <h1 className="text-xl font-bold text-slate-800">ASISTENTE MÉDICO 3D</h1>
        <p className="text-sm text-slate-500">Módulo del asistente · modo desarrollo</p>
      </header>

      <AssistantRobot ref={robotRef} state={robotState} />

      <div className="absolute right-6 top-6 z-10">
        <AssistantPanel {...assistant} onListen={assistant.listen} />
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur">
        {DEV_STATES.map(([name, label]) => (
          <button
            key={name}
            type="button"
            onClick={() => setForced(name)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              robotState === name ? 'bg-sky-500 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
