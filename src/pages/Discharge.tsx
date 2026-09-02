import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2 } from 'lucide-react'

export default function Discharge() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', family_phone: '', diagnosis: '',
    discharge_date: '', risk_level: 'Medium', meds: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userId = session?.user?.id

      // 1. Insert patient
      const { data: patient, error: pErr } = await supabase
        .from('patients').insert({
          name: form.name, phone: form.phone, family_phone: form.family_phone,
          diagnosis: form.diagnosis, discharge_date: form.discharge_date,
          risk_level: form.risk_level, created_by: userId,
        }).select().single()

      if (pErr) throw pErr

      // 2. Insert discharge plan
      const { error: dpErr } = await supabase
        .from('discharge_plans').insert({
          patient_id: patient.id, meds_json: { medications: form.meds },
          created_by: userId,
        })

      if (dpErr) throw dpErr

      // 3. Auto-create followups for day 3, 7, 14, 30
      const dischargeDate = new Date(form.discharge_date)
      const followupDays = [3, 7, 14, 30]
      const followups = followupDays.map(day => {
        const scheduled = new Date(dischargeDate)
        scheduled.setDate(scheduled.getDate() + day)
        return {
          patient_id: patient.id,
          day,
          scheduled_date: scheduled.toISOString().split('T')[0],
          status: 'PENDING',
        }
      })

      const { error: fErr } = await supabase.from('followups').insert(followups)
      if (fErr) throw fErr

      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <CheckCircle2 size={64} className="text-sea-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Patient Discharged</h2>
        <p className="text-gray-500 text-sm">4 follow-ups scheduled (Day 3, 7, 14, 30). Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Discharge Patient</h1>
      <p className="text-gray-500 text-sm mb-6">Register a patient and auto-schedule 30-day follow-ups</p>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Patient Name *</Label>
                <Input id="name" value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Full name" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="+232 7X XXX XXX" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="family_phone">Family Contact Phone</Label>
                <Input id="family_phone" value={form.family_phone} onChange={e => update('family_phone', e.target.value)} placeholder="+232 7X XXX XXX" />
              </div>
              <div>
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                <Input id="diagnosis" value={form.diagnosis} onChange={e => update('diagnosis', e.target.value)} required placeholder="e.g. Schizophrenia" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discharge_date">Discharge Date *</Label>
                <Input id="discharge_date" type="date" value={form.discharge_date} onChange={e => update('discharge_date', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="risk_level">Risk Level *</Label>
                <Select id="risk_level" value={form.risk_level} onChange={e => update('risk_level', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="meds">Medications & Instructions</Label>
              <Textarea id="meds" value={form.meds} onChange={e => update('meds', e.target.value)} placeholder="e.g. Haloperidol 5mg twice daily, Chlorpromazine 100mg at night" rows={3} />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Discharging...' : 'Discharge & Schedule Follow-ups'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
