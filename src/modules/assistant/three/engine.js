import * as THREE from 'three';
import { createScene } from './scene.js';
import { createRobot } from './robot/robot.js';
import { RobotAnimator } from './robot/animator.js';

/** Monta el robot dentro de `container` y arranca el loop.
 *  Devuelve una API mínima; React no necesita saber nada de three. */
export function mountRobotScene(container, { interactive = true } = {}) {
  const { scene, camera, renderer, controls, dispose: disposeScene } = createScene(container, { interactive });

  const robot = createRobot();
  scene.add(robot.root);
  const animator = new RobotAnimator(robot);

  const clock = new THREE.Clock();
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    animator.update(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  };
  loop();

  return {
    setState: (name) => animator.setState(name),
    blink: () => animator.blink(),
    dispose: () => {
      cancelAnimationFrame(raf);
      disposeScene();
    },
  };
}
