import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import LoginDialog from '../components/LoginDialog'

export default function PublicHome() {
  const { profile } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {profile ? (
            <Link to="/app" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              Ir a mi panel
            </Link>
          ) : (
            <button onClick={() => setLoginOpen(true)}
              className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              Acceso del personal
            </button>
          )}
          <p className="text-sm font-semibold text-slate-700">Hospital del Norte · El Alto</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-slate-500">Aquí irá el robot y la información del hospital (siguiente entrega).</p>
      </main>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}