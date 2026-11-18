// API pública del módulo del asistente. El sistema solo debería importar desde aquí.
export { default as AssistantRobot } from './components/AssistantRobot.jsx';
export { default as AssistantPanel } from './components/AssistantPanel.jsx';
export { useAssistant } from './hooks/useAssistant.js';
export { defaultBrain } from './brain/defaultBrain.js';
