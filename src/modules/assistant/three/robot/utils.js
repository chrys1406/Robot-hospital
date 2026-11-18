import * as THREE from 'three';

let glowTexture = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0, 229, 255, 0.65)');
  grad.addColorStop(0.45, 'rgba(0, 195, 255, 0.22)');
  grad.addColorStop(1, 'rgba(0, 195, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

export function addGlowSprite(parent, x, y, z, scaleX, scaleY) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(scaleX, scaleY, 1);
  parent.add(sprite);
  return sprite;
}

export function createSquircleVisorGeometry(rx, ry, rz, power = 2.8) {
  const geo = new THREE.SphereGeometry(1, 72, 72);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, y);
    if (r > 0.0001) {
      const cos = x / r;
      const sin = y / r;
      const denom = Math.pow(Math.pow(Math.abs(cos), power) + Math.pow(Math.abs(sin), power), 1 / power);
      x = (cos / denom) * r;
      y = (sin / denom) * r;
    }
    pos.setXYZ(i, x * rx, y * ry, z * rz);
  }
  geo.computeVertexNormals();
  return geo;
}
