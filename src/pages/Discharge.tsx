import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export default function Discharge() {
  const { session } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    family_phone: '',
    diagnosis: '',
    discharge_date: new Date().toISOString().split('T')[0],
    risk_level: 'medium',
    medications: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patientLink, setPatientLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          created_by: session!.user.id,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          family_phone: form.family_phone.trim() || null,
          diagnosis: form.diagnosis.trim(),
          risk_level: form.risk_level,
          discharge_date: form.discharge_date,
          medications: form.medications.trim() || null,
        })
        .select('access_token')
        .single()
      if (error) throw error
      setPatientLink(`${window.location.origin}/p/${data.access_token}`)
    } catch (err: any) {
      setError(err.message || 'Could not save patient')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(patientLink!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (patientLink) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Patient registered</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {form.full_name} is now in the 30-day follow-up program. Follow-ups are scheduled for
            days 3, 7, 14 and 30 after discharge.
          </p>
          <div className="mt-6 text-left">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Private patient link
            </p>
            <p className="text-xs text-gray-400 mb-2">
              Send this to the patient (or a family member). They can use it to chat with you
              without creating an account.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={patientLink}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 bg-gray-50 truncate"
              />
              <button
                onClick={copyLink}
                className="text-sm px-4 py-2 bg-sea-500 text-white rounded hover:bg-sea-600 whitespace-nowrap"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setPatientLink(null)
              setForm({
                full_name: '',
                phone: '',
                family_phone: '',
                diagnosis: '',
                discharge_date: new Date().toISOString().split('T')[0],
                risk_level: 'medium',
                medications: '',
              })
            }}
            className="mt-6 text-sm px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Register another patient
          </button>
        </div>
      </main>
    )
  }

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sea-500 focus:ring-1 focus:ring-sea-500'

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Discharge patient</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">
        Registers the patient and schedules follow-ups on days 3, 7, 14 and 30.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
          <input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
            className={inputCls} placeholder="Patient full name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input required value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className={inputCls} placeholder="+232 7X XXX XXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Family contact <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input value={form.family_phone} onChange={(e) => set('family_phone', e.target.value)}
              className={inputCls} placeholder="+232 7X XXX XXX" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
          <input required value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)}
            className={inputCls} placeholder="e.g. Schizophrenia" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discharge date</label>
            <input required type="date" value={form.discharge_date}
              onChange={(e) => set('discharge_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk level</label>
            <select value={form.risk_level} onChange={(e) => set('risk_level', e.target.value)}
              className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medications <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea value={form.medications} onChange={(e) => set('medications', e.target.value)}
            className={inputCls} rows={3}
            placeholder="e.g. Haloperidol 5mg twice daily" />
        </div>
        <button type="submit" disabled={busy}
          className="w-full bg-sea-500 text-white text-sm font-medium rounded px-3 py-2.5 hover:bg-sea-600 disabled:opacity-50">
          {busy ? 'Saving' : 'Register patient'}
        </button>
      </form>
    </main>
  )
}
