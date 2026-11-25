const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// El orden importa: el primero que coincide gana
const PATTERNS = [
  ['emergencia', /(no puedo respirar|dolor de pecho|infarto|convulsion|desmayo|me desmaye|sangra mucho|sangrado fuerte|inconsciente)/],
  ['dolor', /(dolor|duele|duelen|fiebre|herida|sangr|mareo|vomit|golpe|lesion|torci|fractur|hinchad|quemadur|infeccion)/],
  ['despedida', /(gracias|chau|adios|hasta luego|nos vemos|eso es todo)/],
  ['saludo', /^(hola|hey|buenas|buenos dias|buenas tardes|buenas noches)/],
];

/** Devuelve 'emergencia' | 'dolor' | 'despedida' | 'saludo' | null */
export function detectReaction(text = '') {
  const t = norm(text);
  for (const [name, re] of PATTERNS) {
    if (re.test(t)) return name;
  }
  return null;
}