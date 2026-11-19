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

  let last = performance.now();
  let raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.1); // segundos, con tope por si la pestaña estuvo en segundo plano
    last = now;
    animator.update(dt);
    controls.update();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    setState: (name) => animator.setState(name),
    blink: () => animator.blink(),
    dispose: () => {
      cancelAnimationFrame(raf);
      disposeScene();
    },
  };
}