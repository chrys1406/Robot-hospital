import { useCallback, useEffect, useRef, useState } from 'react';
import { detectReaction } from '../reactions.js';

const IGNORED_TEXTS = ['', 'Transcribiendo…', '[Audio enviado]'];

/**
 * Prioridad: hablando > escuchando (grabando/escribiendo) > pensando > reacción temporal > reposo.
 * - dolor/emergencia: parpadea dos veces al instante y se muestra preocupado.
 * - saludo/despedida: saluda con la mano cuando termina de responder.
 */
export function useRobotMood({ assistant, typing, robotRef }) {
  const { phase, isRecording, userText } = assistant;

  const [flash, setFlash] = useState('saludo'); // saludo inicial
  const [reaction, setReaction] = useState(null);
  const pendingRef = useRef(null);
  const flashTimer = useRef(0);

  const showFlash = useCallback((name, ms) => {
    clearTimeout(flashTimer.current);
    setFlash(name);
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  }, []);

  // Fin del saludo inicial
  useEffect(() => {
    flashTimer.current = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(flashTimer.current);
  }, []);

  // Detectar la reacción cuando llega un mensaje del usuario
  useEffect(() => {
    if (IGNORED_TEXTS.includes(userText)) return;
    const r = detectReaction(userText);
    setReaction(r);

    const worried = r === 'dolor' || r === 'emergencia';
    const greets = r === 'saludo' || r === 'despedida';
    pendingRef.current = worried ? 'preocupado' : greets ? 'saludo' : null;

    if (worried) {
      robotRef.current?.blink();
      setTimeout(() => robotRef.current?.blink(), 600);
    }
  }, [userText, robotRef]);

  // Al terminar de responder, mostrar la reacción pendiente unos segundos
  useEffect(() => {
    if (phase === 'reposo' && pendingRef.current) {
      showFlash(pendingRef.current, 3000);
      pendingRef.current = null;
    }
  }, [phase, showFlash]);

  const thinking = phase === 'escuchando' && !isRecording;

  let robotState = 'reposo';
  if (phase === 'hablando') robotState = 'hablando';
  else if (isRecording || typing) robotState = 'escuchando';
  else if (thinking) {
    robotState = reaction === 'dolor' || reaction === 'emergencia' ? 'preocupado' : 'pensando';
  } else if (flash) robotState = flash;

  return { robotState, thinking };
}