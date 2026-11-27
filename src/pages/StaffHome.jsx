import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const ROLE_LABEL = {
  medico: 'Médico',
  enfermeria: 'Enfermería',
  jefatura_enfermeria: 'Jefatura de enfermería',
  director: 'Dirección',
  calidad: 'Calidad',
}

export default function StaffHome() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <p className="text-sm text-slate-500">Sesión iniciada</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{profile.full_name}</h1>
        <p className="mt-1 text-slate-600">
          {ROLE_LABEL[profile.role]}{profile.services?.name ? ` · ${profile.services.name}` : ''}
        </p>
        <button
          onClick={async () => { await signOut(); navigate('/') }}
          className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}