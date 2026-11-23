import { useState } from 'react';

const STATUS = {
  reposo: 'Listo',
  escuchando: 'Escuchando / Pensando…',
  hablando: 'Hablando…',
};

export default function AssistantPanel({
  phase,
  userText,
  botText,
  error,
  supported,
  isRecording,
  onListen,
  onSendText,
}) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !onSendText) return;
    setInputText('');
    onSendText(trimmed);
  };

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
        className={`rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition
          disabled:cursor-not-allowed disabled:opacity-50
          ${isRecording ? 'animate-pulse bg-red-500' : 'bg-slate-900 hover:bg-slate-700'}`}
      >
        {isRecording ? '⏹️ Detener y enviar audio' : '🎤 Grabar audio'}
      </button>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe tu consulta…"
          className="flex-1 rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </form>

      <p className="text-center text-xs text-red-500 font-medium">{error}</p>
      {!error && <p className="text-center text-xs text-slate-500">{STATUS[phase]}</p>}
    </div>
  );
}