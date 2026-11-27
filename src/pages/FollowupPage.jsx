import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-xl px-4 py-4">
          <p className="text-sm font-semibold text-teal-700">Hospital del Norte</p>
          <h1 className="text-lg font-bold">Seguimiento posterior al alta</h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-xl px-4 pb-10 text-xs text-slate-500">
        Si sientes que empeoras o tienes una urgencia, acude a Emergencias del hospital sin esperar.
      </footer>
    </div>
  )
}

function YesNo({ id, value, onChange }) {
  const base = 'flex-1 rounded-xl border-2 px-4 py-3 text-base font-semibold transition'
  return (
    <div className="mt-3 flex gap-3" role="group" aria-labelledby={`${id}-label`}>
      {[['si', 'Sí'], ['no', 'No']].map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`${base} ${value === v ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Scale({ id, value, onChange }) {
  return (
    <div className="mt-3" role="group" aria-labelledby={`${id}-label`}>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)}
            className={`rounded-lg border-2 py-2 text-base font-semibold transition ${value === n ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500"><span>Sin dolor</span><span>El peor dolor</span></div>
    </div>
  )
}

export default function FollowupPage() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading' })   // loading | ready | error | done
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get(`/public/followup/${token}`, { auth: false })
      .then((d) => !cancelled && setState({ status: 'ready', questions: d.questionnaire.questions }))
      .catch((e) => !cancelled && setState({ status: 'error', message: e.message }))
    return () => { cancelled = true }
  }, [token])

  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setSubmitError('')
    try {
      const res = await api.post(`/public/followup/${token}`, { answers }, { auth: false })
      setState({ status: 'done', message: res.message, urgent: res.urgent })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (state.status === 'loading') return <Shell><p className="text-slate-500">Cargando…</p></Shell>

  if (state.status === 'error') {
    return (
      <Shell>
        <div role="alert" className="rounded-xl bg-white p-5 shadow-sm">
          <p className="font-semibold text-slate-900">{state.message}</p>
          <p className="mt-2 text-sm text-slate-500">Si necesitas ayuda, comunícate directamente con el hospital.</p>
        </div>
      </Shell>
    )
  }

  if (state.status === 'done') {
    return (
      <Shell>
        <div role="status" className={`rounded-xl p-5 ${state.urgent ? 'bg-red-50 text-red-800' : 'bg-teal-50 text-teal-900'}`}>
          <p className="text-lg font-bold">{state.urgent ? 'Importante' : 'Respuestas recibidas'}</p>
          <p className="mt-2">{state.message}</p>
        </div>
      </Shell>
    )
  }

  const required = state.questions.filter((q) => q.type !== 'text')
  const canSubmit = required.every((q) => answers[q.id] !== undefined)

  return (
    <Shell>
      <p className="mb-5 text-slate-600">Responde estas preguntas para que el equipo de salud sepa cómo te encuentras. Toma menos de un minuto.</p>
      <form onSubmit={submit} className="space-y-6">
        {state.questions.map((q) => (
          <div key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
            <p id={`${q.id}-label`} className="font-medium text-slate-900">{q.text}</p>
            {q.type === 'yesno' && <YesNo id={q.id} value={answers[q.id]} onChange={(v) => set(q.id, v)} />}
            {q.type === 'scale' && <Scale id={q.id} value={answers[q.id]} onChange={(v) => set(q.id, v)} />}
            {q.type === 'text' && (
              <textarea rows={3} maxLength={500} aria-labelledby={`${q.id}-label`}
                value={answers[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" />
            )}
          </div>
        ))}

        {submitError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

        <button type="submit" disabled={!canSubmit || busy}
          className="w-full rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {busy ? 'Enviando…' : 'Enviar mis respuestas'}
        </button>
        {!canSubmit && <p className="text-center text-xs text-slate-500">Responde todas las preguntas con opciones para poder enviar.</p>}
      </form>
    </Shell>
  )
}