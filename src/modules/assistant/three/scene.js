import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Crea escena/cámara/renderer dentro de un contenedor (no de la ventana completa),
 *  para que el robot pueda vivir en cualquier parte del sistema. Fondo transparente. */
export function createScene(container, { interactive = true } = {}) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 1.35, 6.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.2, 0);
  controls.minDistance = 3.5;
  controls.maxDistance = 10;
  controls.enabled = interactive;

  addLights(scene);
  addFloor(scene);

  const resize = () => {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  function dispose() {
    observer.disconnect();
    controls.dispose();
    scene.traverse((o) => o.geometry?.dispose?.());
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, renderer, controls, dispose };
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 2.0));

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xdbeafe, 1.3);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const neckGlow = new THREE.PointLight(0x00d9ff, 1.4, 2.2);
  neckGlow.position.set(0, 1.15, 0.25);
  scene.add(neckGlow);
}

function addFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.07 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.74;
  floor.receiveShadow = true;
  scene.add(floor);
}
