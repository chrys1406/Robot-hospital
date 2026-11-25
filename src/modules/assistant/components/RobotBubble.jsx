export default function RobotBubble({ thinking, text }) {
  if (!thinking && !text) return null;

  return (
    <div className="pointer-events-none absolute left-4 right-4 top-24 z-10 flex md:left-[56%] md:right-auto md:top-[22%] md:max-w-sm">
      <div
        key={thinking ? 'thinking' : text}
        className="bubble-pop relative rounded-3xl rounded-tl-md bg-white px-5 py-3 text-[15px] leading-snug text-slate-800 shadow-xl"
      >
        {/* colita que apunta al robot */}
        <span className="absolute -left-1.5 top-4 hidden h-3.5 w-3.5 rotate-45 rounded-sm bg-white md:block" />

        {thinking ? (
          <div className="flex items-center gap-1.5 py-1.5" aria-label="El asistente está escribiendo">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        ) : (
          <p>{text}</p>
        )}
      </div>
    </div>
  );
}