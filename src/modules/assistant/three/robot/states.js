/** Poses/estados del robot. Para agregar uno nuevo, añade una entrada aquí. */
export const states = {
  reposo: {
    eyeScaleY: 1.0, eyeScaleX: 1.0, eyeTilt: 0.04, eyeLookSpeed: 0.5, eyeLookAmp: 0.015,
    headTiltZ: 0.03, headTurnY: 0.0, headPitchX: 0.0,
    leftArmZ: -0.35, rightArmZ: 0.35, waveAmp: 0.03, waveSpeed: 2.0,
    talkPulse: 0.0, floatSpeed: 2.0,
  },
  saludo: {
    eyeScaleY: 1.0, eyeScaleX: 1.0, eyeTilt: 0.08, eyeLookSpeed: 0.0, eyeLookAmp: 0.0,
    headTiltZ: 0.09, headTurnY: 0.04, headPitchX: 0.0,
    leftArmZ: -0.52, rightArmZ: 2.25, waveAmp: 0.12, waveSpeed: 4.2,
    talkPulse: 0.0, floatSpeed: 2.2,
  },
  escuchando: {
    eyeScaleY: 1.15, eyeScaleX: 0.98, eyeTilt: -0.05, eyeLookSpeed: 1.8, eyeLookAmp: 0.045,
    headTiltZ: -0.12, headTurnY: -0.08, headPitchX: 0.04,
    leftArmZ: -0.28, rightArmZ: 0.42, waveAmp: 0.01, waveSpeed: 1.5,
    talkPulse: 0.0, floatSpeed: 1.6,
  },
  hablando: {
    eyeScaleY: 1.0, eyeScaleX: 1.0, eyeTilt: 0.06, eyeLookSpeed: 0.8, eyeLookAmp: 0.02,
    headTiltZ: 0.05, headTurnY: 0.0, headPitchX: -0.02,
    leftArmZ: -0.55, rightArmZ: 0.65, waveAmp: 0.07, waveSpeed: 3.4,
    talkPulse: 1.0, floatSpeed: 2.3,
  },
  // Pensando: mira hacia arriba y alrededor, con una mano levantada
  pensando: {
    eyeScaleY: 0.95, eyeScaleX: 1.0, eyeTilt: 0.0, eyeLookSpeed: 1.3, eyeLookAmp: 0.05,
    headTiltZ: 0.1, headTurnY: 0.06, headPitchX: -0.05,
    leftArmZ: -0.4, rightArmZ: 0.9, waveAmp: 0.02, waveSpeed: 1.5,
    talkPulse: 0.0, floatSpeed: 1.8,
  },
  // Preocupado: ojos más abiertos e inclinados, cabeza ladeada
  preocupado: {
    eyeScaleY: 1.12, eyeScaleX: 0.97, eyeTilt: -0.14, eyeLookSpeed: 0.6, eyeLookAmp: 0.01,
    headTiltZ: -0.15, headTurnY: 0.0, headPitchX: 0.06,
    leftArmZ: -0.25, rightArmZ: 0.3, waveAmp: 0.01, waveSpeed: 1.2,
    talkPulse: 0.0, floatSpeed: 1.4,
  },
};

export const INITIAL_STATE = 'saludo';

/** Valores numéricos que se interpolan suavemente entre estados. */
export const BLENDED_KEYS = [
  'eyeScaleY', 'eyeScaleX', 'eyeTilt', 'headTiltZ', 'headTurnY',
  'headPitchX', 'leftArmZ', 'rightArmZ', 'waveAmp', 'talkPulse',
];