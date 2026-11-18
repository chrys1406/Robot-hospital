const STATUS = {
  reposo: 'Listo',
  escuchando: 'Escuchando…',
  hablando: 'Hablando…',
};

/** Botón de micrófono + transcripción. Es opcional: el sistema puede usar su propia UI
 *  y solo consumir useAssistant(). */
export default function AssistantPanel({ phase, userText, botText, error, supported, onListen }) {
  const listening = phase === 'escuchando';

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {(userText || botText) && (
        <div className="rounded-2xl bg-white/90 p-4 text-sm shadow-lg backdrop-blur">
          {userText && <p className="mb-2 text-slate-500">Tú: {userText}</p>}
          {botText && <p className="font-semibold text-sky-700">Asistente: {botText}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={onListen}
        disabled={!supported}
        title={supported ? '' : 'Tu navegador no soporta reconocimiento de voz (usa Chrome o Edge)'}
        className={`rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition
          disabled:cursor-not-allowed disabled:opacity-50
          ${listening ? 'animate-pulse bg-red-500' : 'bg-slate-900 hover:bg-slate-700'}`}
      >
        🎤 {listening ? 'Escuchando…' : 'Hablar con el asistente'}
      </button>

      <p className="text-center text-xs text-slate-500">{error || STATUS[phase]}</p>
    </div>
  );
}
