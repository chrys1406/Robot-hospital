import * as THREE from 'three';
import { materials as m } from './materials.js';
import { addGlowSprite } from './utils.js';

export function createBody() {
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.34, 0);

  // Torso
  const torsoPoints = [
    [0.0, -0.72], [0.11, -0.66], [0.28, -0.46], [0.45, -0.2], [0.53, 0.05],
    [0.51, 0.3], [0.41, 0.48], [0.22, 0.56], [0.0, 0.57],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPoints, 64), m.white);
  torso.scale.set(1.04, 1, 0.92);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const seamRing = new THREE.Mesh(new THREE.TorusGeometry(0.445, 0.007, 12, 64), m.jointGray);
  seamRing.rotation.x = Math.PI / 2;
  seamRing.scale.set(1.04, 0.92, 1);
  seamRing.position.y = -0.2;
  bodyGroup.add(seamRing);

  const collarGlow = addCollar(bodyGroup);
  addStethoscope(bodyGroup);
  addEmblem(bodyGroup);

  const leftArm = createArm(-1, bodyGroup);
  const rightArm = createArm(1, bodyGroup);

  return { bodyGroup, collarGlow, leftArm, rightArm };
}

function addCollar(bodyGroup) {
  const g = new THREE.Group();
  g.position.set(0, 0.575, 0.03);
  g.rotation.x = 0.14;
  g.scale.set(1.12, 1, 0.95);
  bodyGroup.add(g);

  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.055, 48), m.white));

  const top = new THREE.Mesh(new THREE.SphereGeometry(0.195, 32, 16), m.white);
  top.scale.set(1, 0.18, 1);
  top.position.y = 0.025;
  g.add(top);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.017, 16, 48), m.cyanNeon);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  g.add(ring);

  return addGlowSprite(g, 0, 0.04, 0, 0.75, 0.35);
}

function addStethoscope(bodyGroup) {
  const g = new THREE.Group();
  bodyGroup.add(g);
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  const hoseCurve = new THREE.CatmullRomCurve3([
    v(-0.26, 0.23, 0.44), v(-0.32, 0.43, 0.34), v(-0.27, 0.56, 0.05), v(-0.18, 0.58, -0.22),
    v(0.0, 0.58, -0.27), v(0.18, 0.58, -0.22), v(0.27, 0.56, 0.05), v(0.33, 0.42, 0.34),
    v(0.31, 0.16, 0.47), v(0.24, -0.05, 0.47),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 80, 0.021, 16, false), m.stethoTeal);
  hose.castShadow = true;
  g.add(hose);

  const yJunction = new THREE.Mesh(new THREE.SphereGeometry(0.027, 16, 16), m.stethoTeal);
  yJunction.position.set(-0.26, 0.23, 0.44);
  g.add(yJunction);

  const arcL = new THREE.CatmullRomCurve3([v(-0.26, 0.23, 0.44), v(-0.36, 0.16, 0.42), v(-0.38, -0.05, 0.41), v(-0.29, -0.22, 0.42)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(arcL, 32, 0.011, 12, false), m.chrome));

  const arcR = new THREE.CatmullRomCurve3([v(-0.26, 0.23, 0.44), v(-0.18, 0.15, 0.49), v(-0.17, -0.05, 0.49), v(-0.22, -0.22, 0.45)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(arcR, 32, 0.011, 12, false), m.chrome));

  const tipGeo = new THREE.CapsuleGeometry(0.018, 0.022, 8, 16);
  const tipLeft = new THREE.Mesh(tipGeo, m.stethoTeal);
  tipLeft.position.set(-0.285, -0.225, 0.42);
  tipLeft.rotation.z = -0.6;
  g.add(tipLeft);
  const tipRight = new THREE.Mesh(tipGeo, m.stethoTeal);
  tipRight.position.set(-0.225, -0.225, 0.45);
  tipRight.rotation.z = 0.5;
  g.add(tipRight);

  const chest = new THREE.Group();
  chest.position.set(0.23, -0.08, 0.475);
  chest.rotation.y = 0.42;
  chest.rotation.x = 0.18;
  g.add(chest);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.06, 20), m.chrome);
  stem.position.set(0.01, 0.055, -0.005);
  chest.add(stem);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.026, 40), m.chrome);
  disc.rotation.x = Math.PI / 2;
  chest.add(disc);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 12, 36), m.darkMetal);
  inner.position.z = 0.013;
  chest.add(inner);

  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.029, 24), m.chrome);
  dot.rotation.x = Math.PI / 2;
  chest.add(dot);
}

function addEmblem(bodyGroup) {
  const g = new THREE.Group();
  g.position.set(-0.01, 0.16, 0.515);
  g.rotation.x = -0.1;
  bodyGroup.add(g);

  const circle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 36), m.stethoTeal);
  circle.rotation.x = Math.PI / 2;
  g.add(circle);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.085, 0.015), m.white);
  crossV.position.z = 0.002;
  g.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.024, 0.015), m.white);
  crossH.position.z = 0.002;
  g.add(crossH);
}

function createArm(side, bodyGroup) {
  const socket = new THREE.Group();
  socket.position.set(side * 0.44, 0.34, 0.02);
  bodyGroup.add(socket);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 32), m.jointGray);
  ball.position.set(side * 0.05, 0, 0);
  socket.add(ball);

  const armPivot = new THREE.Group();
  armPivot.position.set(side * 0.12, 0, 0);
  socket.add(armPivot);

  const paddle = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), m.white);
  paddle.scale.set(0.11, 0.48, 0.26);
  paddle.position.set(0, -0.34, 0);
  paddle.rotation.y = side * -0.45;
  paddle.castShadow = true;
  armPivot.add(paddle);

  return armPivot;
}
