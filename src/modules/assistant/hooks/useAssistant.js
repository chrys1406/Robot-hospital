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
 * respond(texto | { audioBlob }) → texto de respuesta.
 * transcribe(audioBlob) → texto. Si se pasa, el audio se transcribe y respond recibe solo texto.
 * autoSpeak: si es true, el robot lee la respuesta en voz alta.
 */
export function useAssistant({
  respond = defaultBrain,
  transcribe = null,
  lang = 'es-419',
  autoSpeak = false,
} = {}) {
  const [phase, setPhase] = useState('reposo');
  const [userText, setUserText] = useState('');
  const [botText, setBotText] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const respondRef = useRef(respond);
  const transcribeRef = useRef(transcribe);
  const recorderRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    respondRef.current = respond;
    transcribeRef.current = transcribe;
  }, [respond, transcribe]);

  const finish = useCallback(() => {
    busyRef.current = false;
    setPhase('reposo');
  }, []);

  const say = useCallback(
    (text) => {
      if (!text) return finish();
      setBotText(text);
      if (!autoSpeak) return finish();
      speak(text, {
        lang,
        onStart: () => setPhase('hablando'),
        onEnd: finish,
      });
    },
    [autoSpeak, lang, finish]
  );

  const sendText = useCallback(
    async (rawText) => {
      const clean = (rawText || '').trim();
      if (!clean || busyRef.current) return;
      stopSpeaking();
      setError('');
      setUserText(clean);
      busyRef.current = true;
      setPhase('escuchando');
      try {
        say(await respondRef.current(clean));
      } catch (err) {
        setError(err?.message || 'Error al consultar la IA.');
        finish();
      }
    },
    [say, finish]
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
        if (busyRef.current) return;
        busyRef.current = true;
        setPhase('escuchando');
        try {
          let input;
          if (transcribeRef.current) {
            setUserText('Transcribiendo…');
            const text = await transcribeRef.current(audioBlob);
            if (!text) {
              setUserText('');
              setError('No se entendió el audio, intenta de nuevo.');
              return finish();
            }
            setUserText(text);
            input = text;
          } else {
            setUserText('[Audio enviado]');
            input = { audioBlob };
          }
          say(await respondRef.current(input));
        } catch (err) {
          setError(err?.message || 'Error al procesar el audio.');
          finish();
        }
      },
    });

    recorderRef.current = recorder;
    return () => {
      recorder?.stop();
      stopSpeaking();
    };
  }, [say, finish]);

  const listen = useCallback(() => {
    stopSpeaking();
    if (!recorderRef.current) {
      setError('Micrófono no disponible en este navegador.');
      return;
    }
    if (recorderRef.current.isRecording()) recorderRef.current.stop();
    else recorderRef.current.start();
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