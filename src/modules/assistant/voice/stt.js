export const micSupported =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined';

export function createAudioRecorder({
  onStart,
  onAudioReady,
  onEnd,
  onError,
  maxDurationMs = 12000,
} = {}) {
  if (!micSupported) return null;

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let timerId = null;
  let isRecording = false;

  const cleanup = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    mediaRecorder = null;
    isRecording = false;
  };

  const stop = () => {
    if (!mediaRecorder || !isRecording) return;
    isRecording = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    try {
      mediaRecorder.stop();
    } catch {
      cleanup();
      onEnd?.();
    }
  };

  const start = async () => {
    if (isRecording) {
      stop();
      return;
    }

    chunks = [];
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        cleanup();
        onError?.('recording-error');
        onEnd?.();
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type });
        cleanup();
        onEnd?.();
        if (audioBlob.size > 0) {
          onAudioReady?.(audioBlob);
        } else {
          onError?.('empty-audio');
        }
      };

      isRecording = true;
      mediaRecorder.start();
      onStart?.();

      timerId = setTimeout(() => {
        stop();
      }, maxDurationMs);
    } catch (err) {
      cleanup();
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        onError?.('not-allowed');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        onError?.('audio-capture');
      } else {
        onError?.('mic-failed');
      }
      onEnd?.();
    }
  };

  return {
    start,
    stop,
    isRecording: () => isRecording,
  };
}