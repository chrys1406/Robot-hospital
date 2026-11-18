import * as THREE from 'three';
import { materials as m } from './materials.js';
import { addGlowSprite, createSquircleVisorGeometry } from './utils.js';

export function createHead() {
  const head = new THREE.Group();
  head.position.set(0, 2.02, 0);

  // Casco + visor
  const helmet = new THREE.Mesh(createSquircleVisorGeometry(1.06, 0.96, 0.94, 2.25), m.white);
  helmet.castShadow = true;
  head.add(helmet);

  const visor = new THREE.Mesh(createSquircleVisorGeometry(0.84, 0.61, 0.34, 2.85), m.visor);
  visor.position.set(0, -0.09, 0.68);
  head.add(visor);

  const gloss = new THREE.Mesh(
    new THREE.RingGeometry(0.54, 0.72, 48, 1, Math.PI * 0.16, Math.PI * 0.68),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
  );
  gloss.position.set(0, 0.03, 0.99);
  gloss.scale.set(1.05, 0.68, 1);
  gloss.rotation.x = -0.35;
  head.add(gloss);

  // Ojos
  const eyesContainer = new THREE.Group();
  head.add(eyesContainer);
  const leftEye = createEye(-1, eyesContainer);
  const rightEye = createEye(1, eyesContainer);

  // Boca LED
  const mouth = createMouth();
  head.add(mouth.group);

  // Orejas / antenas
  const antennas = [createEarAntenna(-1), createEarAntenna(1)];
  antennas.forEach((a) => head.add(a.unit));

  return { head, eyesContainer, leftEye, rightEye, mouth, antennas };
}

function createEye(side, eyesContainer) {
  const wrapper = new THREE.Group();
  wrapper.position.set(side * 0.31, -0.07, 0.99);
  wrapper.rotation.y = side * 0.24;
  eyesContainer.add(wrapper);

  const pivot = new THREE.Group();
  pivot.position.set(0, 0.08, 0);
  wrapper.add(pivot);

  const points = [];
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * (0.08 + t * 0.84);
    points.push(new THREE.Vector3(Math.cos(angle) * 0.19, Math.sin(angle) * 0.175 - 0.08, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.052, 16, false);
  const pos = tubeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i) + 0.08;
    const vz = pos.getZ(i);
    const u = (Math.atan2(vy, vx) / Math.PI - 0.08) / 0.84;
    const center = curve.getPointAt(Math.min(1, Math.max(0, u)));
    const factor = 0.72 + 0.35 * Math.sin(u * Math.PI);
    pos.setXYZ(
      i,
      center.x + (vx - center.x) * factor,
      center.y + (vy - 0.08 - center.y) * factor,
      center.z + (vz - center.z) * factor
    );
  }
  tubeGeo.computeVertexNormals();
  pivot.add(new THREE.Mesh(tubeGeo, m.cyanNeon));

  const capGeo = new THREE.SphereGeometry(0.038, 16, 16);
  const capL = new THREE.Mesh(capGeo, m.cyanNeon);
  capL.position.copy(curve.getPoint(0));
  pivot.add(capL);
  const capR = new THREE.Mesh(capGeo, m.cyanNeon);
  capR.position.copy(curve.getPoint(1));
  pivot.add(capR);

  const glow = addGlowSprite(pivot, 0, 0.01, -0.01, 0.62, 0.42);
  return { pivot, glow };
}

function createMouth() {
  const group = new THREE.Group();
  group.position.set(0, -0.27, 0.99);

  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ color: 0x010306 }));
  bg.position.z = -0.002;
  group.add(bg);

  const bars = [];
  const numBars = 5;
  for (let i = 0; i < numBars; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.01), m.cyanNeon);
    bar.position.set((i - 2) * 0.055, 0, 0);
    group.add(bar);
    bars.push(bar);
  }
  addGlowSprite(group, 0, 0, -0.01, 0.4, 0.2);
  group.visible = false;
  return { group, bars };
}

function createEarAntenna(side) {
  const unit = new THREE.Group();
  unit.position.set(side * 1.05, -0.06, 0.02);
  unit.rotation.z = side * -0.12;

  const earBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 40), m.white);
  earBase.rotation.z = Math.PI / 2;
  unit.add(earBase);

  const earRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.018, 16, 48), m.cyanNeon);
  earRing.rotation.y = Math.PI / 2;
  earRing.position.x = side * 0.02;
  unit.add(earRing);

  const earCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), m.white);
  earCap.scale.set(0.35, 1, 1);
  earCap.position.x = side * 0.04;
  unit.add(earCap);

  const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.6, 12, 24), m.white);
  blade.scale.set(0.6, 1, 1.2);
  blade.position.set(side * 0.04, 0.45, -0.02);
  blade.rotation.z = side * -0.15;
  unit.add(blade);

  const strip = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.48, 8, 16), m.cyanNeon);
  strip.position.set(side * 0.055, 0.46, 0.025);
  strip.rotation.z = side * -0.15;
  unit.add(strip);

  const tipGlow = addGlowSprite(unit, side * 0.08, 0.72, 0.03, 0.35, 0.35);
  return { unit, tipGlow, side };
}
