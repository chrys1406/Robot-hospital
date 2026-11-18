import { useCallback, useEffect, useRef, useState } from 'react';
import { createListener, sttSupported } from '../voice/stt.js';
import { speak, stopSpeaking } from '../voice/tts.js';
import { defaultBrain } from '../brain/defaultBrain.js';

const ERRORS = {
  'not-allowed': 'Permiso de micrófono denegado.',
  'no-speech': 'No te escuché, intenta de nuevo.',
  'audio-capture': 'No se encontró micrófono.',
  network: 'Error de red en el reconocimiento de voz.',
};

/**
 * Ciclo completo: escuchar → pensar → hablar.
 * `respond(texto)` es el punto de conexión con el sistema: recibe lo que dijo el
 * usuario y devuelve (o promete) el texto que dirá el robot.
 * Devuelve `phase` ('reposo' | 'escuchando' | 'hablando') para pasárselo al robot.
 */
export function useAssistant({ respond = defaultBrain, lang = 'es-419' } = {}) {
  const [phase, setPhase] = useState('reposo');
  const [userText, setUserText] = useState('');
  const [botText, setBotText] = useState('');
  const [error, setError] = useState('');

  const respondRef = useRef(respond);
  const listenerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    respondRef.current = respond;
  }, [respond]);

  const say = useCallback(
    (text) => {
      setBotText(text);
      speak(text, {
        lang,
        onStart: () => setPhase('hablando'),
        onEnd: () => {
          busyRef.current = false;
          setPhase('reposo');
        },
      });
    },
    [lang]
  );

  useEffect(() => {
    const listener = createListener({
      lang,
      onStart: () => {
        setError('');
        setPhase('escuchando');
      },
      onResult: async (text, isFinal) => {
        setUserText(text);
        if (!isFinal || !text) return;
        busyRef.current = true;
        try {
          say(await respondRef.current(text));
        } catch {
          say('Tuve un problema para responder. Intenta de nuevo.');
        }
      },
      onError: (e) => {
        setError(ERRORS[e] ?? `Error: ${e}`);
        setPhase('reposo');
      },
      onEnd: () => {
        if (!busyRef.current) setPhase('reposo');
      },
    });
    listenerRef.current = listener;
    return () => {
      listener?.stop();
      stopSpeaking();
    };
  }, [lang, say]);

  const listen = useCallback(() => {
    stopSpeaking();
    setUserText('');
    listenerRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    listenerRef.current?.stop();
  }, []);

  return { phase, userText, botText, error, supported: sttSupported, listen, say, stop };
}
