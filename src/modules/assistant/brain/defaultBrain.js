/** "Cerebro" del asistente: recibe lo que dijo el usuario y devuelve la respuesta.
 *  Hoy son reglas simples. Más adelante aquí se conecta tu backend / base de datos / IA. */
const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const rules = [
  { match: /(hola|buenas|buenos dias|buenas tardes)/, reply: 'Hola, soy tu asistente médico. ¿En qué puedo ayudarte?' },
  { match: /(emergencia|urgencia|grave|no puedo respirar)/, reply: 'Si es una emergencia, dirígete de inmediato a emergencias o llama al servicio de ambulancias. Te acompaño hasta recepción.' },
  { match: /(cita|agendar|reservar)/, reply: 'Claro, puedo ayudarte a agendar una cita. ¿Con qué especialidad quieres atenderte?' },
  { match: /(horario|atienden|abierto)/, reply: 'El horario de atención lo configuraremos desde el sistema. Por ahora es una respuesta de prueba.' },
  { match: /(dolor|fiebre|sintoma|me siento mal)/, reply: 'Lamento que no te sientas bien. No puedo diagnosticar, pero puedo orientarte para que un médico te atienda. ¿Dónde sientes la molestia?' },
  { match: /(gracias|chau|adios)/, reply: 'Con gusto. ¡Que te mejores!' },
];

export async function defaultBrain(userText) {
  const text = norm(userText);
  const rule = rules.find((r) => r.match.test(text));
  return rule ? rule.reply : 'No te entendí bien. ¿Puedes repetirlo, por favor?';
}
