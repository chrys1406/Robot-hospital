const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Respuestas instantáneas (sin red). Devuelve null si no aplica. Solo casos seguros y claros. */
export function localReply(text = '') {
  const t = norm(text);

  if (/(no puedo respirar|dolor de pecho|infarto|convulsion|desmayo|me desmaye|sangra mucho|sangrado fuerte|inconsciente)/.test(t)) {
    return 'Si es una emergencia, dirígete ahora mismo al área de emergencias en planta baja o pide ayuda al personal más cercano.';
  }
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches)[\s!.,]*$/.test(t)) {
    return 'Hola, soy tu asistente del hospital. ¿En qué puedo ayudarte?';
  }
  if (/^(gracias|muchas gracias|chau|adios|hasta luego)[\s!.,]*$/.test(t)) {
    return 'Con gusto. ¡Que te mejores!';
  }
  return null;
}