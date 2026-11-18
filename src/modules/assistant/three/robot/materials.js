import * as THREE from 'three';

export const materials = {
  white: new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.22, metalness: 0.02, clearcoat: 0.85, clearcoatRoughness: 0.14,
  }),
  jointGray: new THREE.MeshStandardMaterial({ color: 0xb8c4d0, roughness: 0.45, metalness: 0.25 }),
  stethoTeal: new THREE.MeshPhysicalMaterial({ color: 0x1d5b63, roughness: 0.35, metalness: 0.05, clearcoat: 0.4 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.4, metalness: 0.5 }),
  visor: new THREE.MeshPhysicalMaterial({
    color: 0x04060a, roughness: 0.05, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.04,
  }),
  cyanNeon: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
};
