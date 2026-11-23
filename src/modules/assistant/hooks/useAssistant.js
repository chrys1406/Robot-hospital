import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioRecorder, micSupported } from '../voice/stt.js';
import { speak, stopSpeaking } from '../voice/tts.js';
import { defaultBrain } from '../brain/defaultBrain.js';

const ERRORS = {
  'not-allowed': 'Permiso de micrófono denegado.',
  'audio-capture': 'No se encontró micrófono.',
  'mic-failed': 'No se pudo acceder al micrófono.',
  'recording-error': 'Error al grabar el audio.',
  'empty-audio': 'No se captó audio, intenta de nuevo.',
};

/**
 * `respond` puede recibir un string (texto) o un objeto { text, audioBlob }.
 * `autoSpeak`: si es false, muestra la respuesta en texto sin hablar todavía (útil para probar la IA primero).
 */
export function useAssistant({
  respond = defaultBrain,
  lang = 'es-419',
  autoSpeak = false,
} = {}) {
  const [phase, setPhase] = useState('reposo');
  const [userText, setUserText] = useState('');
  const [botText, setBotText] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const respondRef = useRef(respond);
  const recorderRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    respondRef.current = respond;
  }, [respond]);

  const say = useCallback(
    (text) => {
      if (!text) {
        busyRef.current = false;
        setPhase('reposo');
        return;
      }
      setBotText(text);
      if (!autoSpeak) {
        busyRef.current = false;
        setPhase('reposo');
        return;
      }
      speak(text, {
        lang,
        onStart: () => setPhase('hablando'),
        onEnd: () => {
          busyRef.current = false;
          setPhase('reposo');
        },
      });
    },
    [autoSpeak, lang]
  );

  const sendText = useCallback(
    async (rawText) => {
      const clean = (rawText || '').trim();
      if (!clean) return;
      stopSpeaking();
      setError('');
      setUserText(clean);
      busyRef.current = true;
      setPhase('escuchando');
      try {
        const reply = await respondRef.current(clean);
        say(reply);
      } catch (err) {
        setError(err?.message || 'Error al consultar la IA.');
        busyRef.current = false;
        setPhase('reposo');
      }
    },
    [say]
  );

  useEffect(() => {
    const recorder = createAudioRecorder({
      onStart: () => {
        setError('');
        setIsRecording(true);
        setPhase('escuchando');
      },
      onError: (code) => {
        setError(ERRORS[code] ?? `Error: ${code}`);
        if (!busyRef.current) setPhase('reposo');
      },
      onEnd: () => {
        setIsRecording(false);
        if (!busyRef.current) setPhase('reposo');
      },
      onAudioReady: async (audioBlob) => {
        busyRef.current = true;
        setPhase('escuchando');
        setUserText('[Audio enviado]');
        try {
          const reply = await respondRef.current({ audioBlob });
          say(reply);
        } catch (err) {
          setError(err?.message || 'Error al procesar el audio con la IA.');
          busyRef.current = false;
          setPhase('reposo');
        }
      },
    });

    recorderRef.current = recorder;
    return () => {
      recorder?.stop();
      stopSpeaking();
    };
  }, [say]);

  const listen = useCallback(() => {
    stopSpeaking();
    if (!recorderRef.current) {
      setError('Micrófono no disponible en este navegador.');
      return;
    }
    if (recorderRef.current.isRecording()) {
      recorderRef.current.stop();
    } else {
      recorderRef.current.start();
    }
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    recorderRef.current?.stop();
    busyRef.current = false;
    setIsRecording(false);
    setPhase('reposo');
  }, []);

  return {
    phase,
    userText,
    botText,
    error,
    supported: micSupported,
    isRecording,
    listen,
    sendText,
    say,
    stop,
  };
}