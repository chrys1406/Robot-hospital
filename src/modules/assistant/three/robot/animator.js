import * as THREE from 'three';
import { states, INITIAL_STATE, BLENDED_KEYS } from './states.js';

export class RobotAnimator {
  constructor(robot) {
    this.robot = robot;
    this.stateName = INITIAL_STATE;
    this.current = {};
    BLENDED_KEYS.forEach((k) => (this.current[k] = states[INITIAL_STATE][k]));

    this.isBlinking = false;
    this.blinkProgress = 0;
    this.nextBlinkTime = 2.5;
    this.elapsed = 0;
  }

  setState(name) {
    if (!states[name]) return false;
    this.stateName = name;
    return true;
  }

  blink() {
    if (!this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }
  }

  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;
    const target = states[this.stateName];
    const r = this.robot;

    // Transición suave entre estados
    for (const key of BLENDED_KEYS) {
      this.current[key] = THREE.MathUtils.lerp(this.current[key], target[key], 0.04);
    }
    const c = this.current;

    // Parpadeo automático
    if (t >= this.nextBlinkTime && !this.isBlinking) {
      this.blink();
      this.nextBlinkTime = t + 3.0 + Math.random() * 2.5;
    }
    if (this.isBlinking) {
      this.blinkProgress += dt * 7.5;
      if (this.blinkProgress >= Math.PI) {
        this.blinkProgress = 0;
        this.isBlinking = false;
      }
    }
    const blink = this.isBlinking ? Math.sin(this.blinkProgress) : 0;
    const voiceWave = c.talkPulse * (Math.sin(t * 16) * 0.5 + 0.5);

    // Ojos
    const eyeY = Math.max(0.04, c.eyeScaleY * (1 - blink * 0.96));
    const eyeX = c.eyeScaleX + blink * 0.06;
    r.leftEye.pivot.scale.set(eyeX, eyeY, 1);
    r.rightEye.pivot.scale.set(eyeX, eyeY, 1);
    r.leftEye.pivot.rotation.z = c.eyeTilt;
    r.rightEye.pivot.rotation.z = -c.eyeTilt;

    // Boca LED (solo visible al hablar)
    const talking = this.stateName === 'hablando';
    r.mouth.group.visible = talking;
    if (talking) {
      r.mouth.bars.forEach((bar, i) => {
        bar.scale.y = 0.3 + Math.abs(Math.sin(t * 16 + i * 1.1)) * 1.5 * voiceWave;
      });
    }

    // Mirada
    r.eyesContainer.position.x = Math.sin(t * target.eyeLookSpeed) * target.eyeLookAmp;
    r.eyesContainer.position.y = Math.cos(t * target.eyeLookSpeed * 0.7) * (target.eyeLookAmp * 0.4);

    // Brillos
    const g = 1 + voiceWave * 0.8;
    r.collarGlow.scale.set(0.75 * g, 0.35 * g, 1);
    r.antennas.forEach((a) => a.tipGlow.scale.set(0.35 * g, 0.35 * g, 1));

    // Flotar, cabeza y brazos
    r.root.position.y = Math.sin(t * target.floatSpeed) * 0.045;
    r.head.position.y = 2.02 + Math.sin(t * target.floatSpeed - 0.4) * 0.025;
    r.head.rotation.z = c.headTiltZ + Math.sin(t * 1.3) * 0.02;
    r.head.rotation.y = c.headTurnY + Math.sin(t * 0.9) * 0.03;
    r.head.rotation.x = c.headPitchX;

    r.rightArm.rotation.z = c.rightArmZ + Math.sin(t * target.waveSpeed) * c.waveAmp;
    r.leftArm.rotation.z = c.leftArmZ - Math.sin(t * target.waveSpeed * 0.7) * (c.waveAmp * 0.5);
  }
}
