import { useEffect, useRef, useState } from 'react';

const icon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

const IconPhoto = () => (
  <svg {...icon} className="h-5 w-5">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="10.5" r="1.8" />
    <path d="m21 16-5-5-8 8" />
  </svg>
);
const IconMic = () => (
  <svg {...icon} className="h-5 w-5">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const IconStop = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const IconSend = () => (
  <svg {...icon} className="h-5 w-5">
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const IconClose = () => (
  <svg {...icon} className="h-3.5 w-3.5">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export default function ChatBar({
  onSend,
  onToggleRecord,
  isRecording,
  micSupported = true,
  busy = false,
  onTypingChange,
}) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null); // { file, url }
  const fileRef = useRef(null);
  const idleRef = useRef(0);

  useEffect(() => () => clearTimeout(idleRef.current), []);
  useEffect(() => () => photo?.url && URL.revokeObjectURL(photo.url), [photo]);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    clearTimeout(idleRef.current);
    if (value.trim()) {
      onTypingChange?.(true);
      idleRef.current = setTimeout(() => onTypingChange?.(false), 1500);
    } else {
      onTypingChange?.(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    const clean = text.trim();
    if (!clean && !photo) return;
    clearTimeout(idleRef.current);
    onTypingChange?.(false);
    onSend?.({ text: clean, photo: photo?.file ?? null });
    setText('');
    setPhoto(null);
  };

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const canSend = !busy && (text.trim() || photo);

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      {photo && (
        <div className="relative w-fit rounded-2xl bg-white/90 p-1.5 shadow-lg backdrop-blur">
          <img src={photo.url} alt="Foto adjunta" className="h-20 w-20 rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-white shadow"
            aria-label="Quitar foto"
          >
            <IconClose />
          </button>
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex items-center gap-1.5 rounded-full bg-white/90 p-1.5 shadow-xl ring-1 ring-slate-200/70 backdrop-blur"
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-sky-600"
          aria-label="Enviar foto"
          title="Enviar foto"
        >
          <IconPhoto />
        </button>

        <input
          type="text"
          value={text}
          onChange={handleChange}
          placeholder="Escribe tu consulta…"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />

        <button
          type="button"
          onClick={onToggleRecord}
          disabled={!micSupported}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isRecording
              ? 'animate-pulse bg-red-500 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-sky-600'
          }`}
          aria-label={isRecording ? 'Detener y enviar audio' : 'Grabar audio'}
          title={isRecording ? 'Detener y enviar' : 'Grabar audio'}
        >
          {isRecording ? <IconStop /> : <IconMic />}
        </button>

        <button
          type="submit"
          disabled={!canSend}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-500 text-white shadow transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label="Enviar"
          title="Enviar"
        >
          <IconSend />
        </button>
      </form>
    </div>
  );
}