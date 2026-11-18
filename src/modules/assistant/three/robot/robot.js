import * as THREE from 'three';
import { createHead } from './head.js';
import { createBody } from './body.js';

/** Ensambla el robot y devuelve el grupo raíz + referencias a las partes animables. */
export function createRobot() {
  const root = new THREE.Group();

  const headParts = createHead();
  const bodyParts = createBody();

  root.add(headParts.head);
  root.add(bodyParts.bodyGroup);

  return { root, ...headParts, ...bodyParts };
}
