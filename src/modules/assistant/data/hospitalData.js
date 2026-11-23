// DATOS DE EJEMPLO (inventados). Al conectar el sistema, getHospitalContext() debe consultar la base de datos real.
const areas = [
  { name: 'Emergencias', location: 'Planta baja, entrada principal', hours: 'Atiende las 24 horas' },
  { name: 'Admisión y citas', location: 'Planta baja, ventanilla 1', hours: 'Lunes a viernes, 07:00 a 18:00' },
  { name: 'Laboratorio', location: 'Piso 1', hours: 'Lunes a sábado, 06:30 a 12:00' },
  { name: 'Farmacia', location: 'Planta baja, junto a admisión', hours: 'Lunes a domingo, 08:00 a 20:00' },
];

const doctors = [
  { name: 'Dra. María Quispe', specialty: 'Pediatría', floor: 2, office: 'Consultorio 204', schedule: 'lunes a viernes, 08:00 a 12:00' },
  { name: 'Dr. Carlos Mamani', specialty: 'Traumatología', floor: 3, office: 'Consultorio 310', schedule: 'martes y jueves, 14:00 a 18:00' },
  { name: 'Dra. Lucía Flores', specialty: 'Medicina general', floor: 1, office: 'Consultorio 105', schedule: 'lunes a sábado, 08:00 a 13:00' },
  { name: 'Dr. Jorge Choque', specialty: 'Cardiología', floor: 3, office: 'Consultorio 305', schedule: 'lunes, miércoles y viernes, 09:00 a 13:00' },
];

export async function getHospitalContext() {
  return { areas, doctors };
}

export function formatContext({ areas, doctors }) {
  const a = areas.map((x) => `- ${x.name}: ${x.location}. ${x.hours}.`).join('\n');
  const d = doctors
    .map((x) => `- ${x.name} (${x.specialty}): piso ${x.floor}, ${x.office}. Atiende ${x.schedule}.`)
    .join('\n');
  return `ÁREAS:\n${a}\n\nDOCTORES:\n${d}`;
}