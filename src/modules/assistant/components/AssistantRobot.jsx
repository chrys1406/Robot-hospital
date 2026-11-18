import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { mountRobotScene } from '../three/engine.js';

/**
 * El robot 3D. Ocupa el 100% de su contenedor padre (dale tamaño desde afuera).
 * Props:
 *  - state: 'reposo' | 'saludo' | 'escuchando' | 'hablando'
 *  - interactive: permite rotar/zoom con el mouse
 * ref: { blink() }
 */
const AssistantRobot = forwardRef(function AssistantRobot(
  { state = 'reposo', interactive = true, className = '' },
  ref
) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const engine = mountRobotScene(containerRef.current, { interactive });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    engineRef.current?.setState(state);
  }, [state, interactive]);

  useImperativeHandle(ref, () => ({ blink: () => engineRef.current?.blink() }), []);

  return <div ref={containerRef} className={`relative h-full w-full ${className}`} />;
});

export default AssistantRobot;
