import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  )
}

// Sin sesión -> a la página pública. Con rol no permitido -> al inicio del personal.
export default function RequireRole({ roles, children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!profile) return <Navigate to="/" replace />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/app" replace />
  return children
}