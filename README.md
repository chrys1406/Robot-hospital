# Asistente Médico 3D (React + Vite + Tailwind)

    npm install
    npm run dev        # http://localhost:5173
    npm run build

Usa Chrome o Edge para la voz (micrófono funciona en localhost o HTTPS).

## Estructura

    src/
    ├── main.jsx · App.jsx · index.css      ← app de desarrollo (solo para probar el robot)
    └── modules/
        └── assistant/                      ← TODO el robot vive aquí, autocontenido
            ├── index.js                    ← API pública (lo único que importa el sistema)
            ├── components/                 ← AssistantRobot, AssistantPanel
            ├── hooks/useAssistant.js       ← escuchar → pensar → hablar
            ├── brain/defaultBrain.js       ← respuestas de prueba (se reemplaza por el sistema)
            ├── voice/                      ← tts.js (hablar) · stt.js (escuchar)
            └── three/                      ← escena, motor y modelo del robot

## Conectarlo al sistema (al final)

1. Copiar `src/modules/assistant/` al proyecto del sistema (y `npm i three`).
2. Usarlo:

       import { AssistantRobot, useAssistant } from './modules/assistant';

       const { phase, listen } = useAssistant({ respond: miFuncionDelSistema });
       <div className="h-96 w-96"><AssistantRobot state={phase} /></div>

   `respond(texto)` recibe lo que dijo el usuario y devuelve el texto que dirá el robot.
