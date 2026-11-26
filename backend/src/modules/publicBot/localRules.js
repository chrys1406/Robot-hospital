// Respuestas instantáneas sin IA: emergencias, riesgo personal y saludos
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const EMERGENCY = [
  /dolor (fuerte |intenso |opresivo )?(de|en)l? (el )?(pecho|torax)/,
  /opresion (en|del) (el )?pecho/,
  /no (puedo|logro|consigo) respirar/,
  /(me )?(ahogo|falta (el )?aire)/,
  /(perdi|perdio|pierdo) (el )?(conocimiento|sentido)/,
  /se desmayo|me desmayo|desmayad/,
  /convulsion/,
  /sangrado (abundante|fuerte)|no para de sangrar/,
  /accidente grave|atropell|herida de bala|apunalad/,
  /(tengo|creo que tengo|estoy teniendo) (un )?(infarto|derrame)/,
  /(esta|estoy) (inconsciente|sin respirar)/,
]
const SELF_HARM = [/quiero morir/, /(quiero|voy a) (hacerme dano|quitarme la vida|suicid)/, /no quiero vivir/, /acabar con mi vida/]
const GREETING = /^(hola+|buenas|buen dia|buenos dias|buenas tardes|buenas noches)[\s!.¡]*$/
const FAREWELL = /^(gracias|muchas gracias|chau|adios|hasta luego|nos vemos)[\s!.¡]*$/

const EMERGENCY_REPLY =
  'Lo que describes puede ser una emergencia. Por favor dirígete ahora mismo a Emergencias del Hospital del Norte, que atiende las 24 horas, o pide a alguien cercano que te lleve. Si ya estás en el hospital, avisa de inmediato al personal más cercano.'
const SELF_HARM_REPLY =
  'Lamento mucho que te sientas así, y gracias por decirlo. Tu seguridad es lo más importante: por favor acude ahora a Emergencias del hospital o pide a una persona de confianza que te acompañe. No tienes que pasar por esto solo.'

export function matchLocalRule(text) {
  const t = norm(text).trim()
  if (SELF_HARM.some((r) => r.test(t))) return { reply: SELF_HARM_REPLY, emergency: true }
  if (EMERGENCY.some((r) => r.test(t))) return { reply: EMERGENCY_REPLY, emergency: true }
  if (GREETING.test(t))
    return { reply: '¡Hola! Soy el asistente del Hospital del Norte. Puedo orientarte sobre servicios, pisos, requisitos de atención y horario de visita. ¿En qué te ayudo?', emergency: false }
  if (FAREWELL.test(t)) return { reply: 'Con gusto. Que te vaya muy bien y cuídate mucho.', emergency: false }
  return null
}