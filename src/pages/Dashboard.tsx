import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  day_number: number
  due_date: string
  status: string
  notes: string | null
  patient: { id: string; full_name: string; phone: string; risk_level: string }
}

const riskStyles: Record<string, string> = {
  high: 'text-red-700 bg-red-50 border-red-200',
  medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  low: 'text-sea-700 bg-sea-50 border-sea-200',
}

function daysAgo(due: string) {
  const diff = Math.floor((Date.now() - new Date(due + 'T00:00:00').getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day overdue'
  return `${diff} days overdue`
}

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([])
  const [tab, setTab] = useState<'today' | 'overdue' | 'done'>('today')
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from('followups')
      .select('id, day_number, due_date, status, notes, patients!inner(id, full_name, phone, risk_level)')
      .order('due_date', { ascending: true })
    if (error) {
      console.error(error)
      setLoading(false)
      return
    }
    const mapped: Row[] = (data || []).map((r: any) => ({
      id: r.id,
      day_number: r.day_number,
      due_date: r.due_date,
      status: r.status,
      notes: r.notes,
      patient: r.patients,
    }))
    setRows(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRows()
    const channel = supabase
      .channel('followups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'followups' },
        () => fetchRows()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRows])

  async function setStatus(id: string, status: 'done' | 'missed') {
    await supabase
      .from('followups')
      .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', id)
    fetchRows()
  }

  const todayRows = rows.filter((r) => r.due_date === today && r.status === 'pending')
  const overdueRows = rows.filter((r) => r.due_date < today && r.status === 'pending')
  const doneRows = rows.filter((r) => r.status === 'done')

  const lists = { today: todayRows, overdue: overdueRows, done: doneRows }
  const current = lists[tab]

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="text-xs text-gray-400">Patients in their 30-day post-discharge window</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-semibold text-sea-600">{todayRows.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Due today</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-semibold text-red-600">{overdueRows.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Overdue</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-semibold text-gray-500">{doneRows.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Completed</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        {(['today', 'overdue', 'done'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === t
                ? 'border-sea-500 text-sea-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t === 'today' ? 'Due today' : t === 'overdue' ? 'Overdue' : 'Completed'}
            <span className="ml-1.5 text-xs text-gray-400">{lists[t].length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading</p>
      ) : current.length === 0 ? (
        <div className="text-center py-14 text-sm text-gray-400">
          {tab === 'today' && 'No follow-ups due today.'}
          {tab === 'overdue' && 'Nothing overdue.'}
          {tab === 'done' && 'No completed follow-ups yet.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {current.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{r.patient.full_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Day {r.day_number} · {r.patient.phone} ·{' '}
                  {r.due_date < today ? daysAgo(r.due_date) : 'Due today'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded border capitalize ${
                    riskStyles[r.patient.risk_level] || ''
                  }`}
                >
                  {r.patient.risk_level}
                </span>
                <Link
                  to={`/messages?patient=${r.patient.id}`}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Message
                </Link>
                {r.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setStatus(r.id, 'done')}
                      className="text-xs px-3 py-1.5 bg-sea-500 text-white rounded hover:bg-sea-600"
                    >
                      Check-in done
                    </button>
                    <button
                      onClick={() => setStatus(r.id, 'missed')}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50"
                    >
                      Missed
                    </button>
                  </>
                )}
                {r.status !== 'pending' && (
                  <span className="text-xs text-gray-400 w-16 text-center capitalize">{r.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
