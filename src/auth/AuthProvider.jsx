import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const PROFILE_COLS = 'id, full_name, role, service_id, center_id, specialty, services(name)'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)                       // ya se leyó la sesión guardada
  const [loaded, setLoaded] = useState({ userId: null, profile: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle().then(({ data }) => {
      if (cancelled) return
      setLoaded({ userId, profile: data ?? null })
      if (!data) supabase.auth.signOut()   // sin perfil activo no se queda con la sesión abierta
    })
    return () => { cancelled = true }
  }, [userId])

  const profile = userId && loaded.userId === userId ? loaded.profile : null
  const loading = !ready || (!!userId && loaded.userId !== userId)

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (!error) return
    if (error.message === 'Invalid login credentials') throw new Error('Correo o contraseña incorrectos.')
    if (/banned/i.test(error.message)) throw new Error('Esta cuenta está desactivada. Consulta con la dirección del hospital.')
    throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.')
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signOut }),
    [session, profile, loading, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}