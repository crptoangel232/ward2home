import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type PatientInfo = {
  id: string
  full_name: string
  diagnosis: string
  risk_level: string
  discharge_date: string
}

type ScheduleItem = {
  day_number: number
  due_date: string
  status: string
}

type Msg = {
  id: string
  sender: string
  body: string
  created_at: string
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function PatientChat() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<PatientInfo | null>(null)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const poll = useCallback(async () => {
    if (!token) return
    const [conv, sched] = await Promise.all([
      supabase.rpc('get_patient_conversation', { p_token: token }),
      supabase.rpc('get_patient_schedule', { p_token: token }),
    ])
    if (conv.error || (conv.data && (conv.data as any).length === 0 && !info)) {
      // no messages is fine; only invalid token shows notFound
    }
    setMessages((conv.data as Msg[]) || [])
    setSchedule((sched.data as ScheduleItem[]) || [])
  }, [token, info])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.rpc('get_patient_by_token', { p_token: token! })
      if (cancelled) return
      if (error || !data || data.length === 0) {
        setNotFound(true)
        return
      }
      const p = data[0] as PatientInfo
      setInfo(p)
      await poll()
      supabase.rpc('mark_patient_read', { p_token: token! })
    }
    load()

    const interval = setInterval(async () => {
      await poll()
      supabase.rpc('mark_patient_read', { p_token: token })
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [token, poll])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || !token) return
    setBusy(true)
    setDraft('')
    const { error } = await supabase.rpc('send_patient_message', {
      p_token: token,
      p_body: body,
    })
    if (error) console.error(error)
    setBusy(false)
    poll()
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-sm w-full">
          <h1 className="text-lg font-semibold">Link not found</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            This link is invalid or has expired. Ask your nurse for a new one.
          </p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <p className="font-semibold text-sm text-sea-600 tracking-tight">Ward2Home</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Hello {info.full_name.split(' ')[0]} — you are in the 30-day follow-up program.
        </p>
      </header>

      {schedule.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">Your check-ins</p>
          <div className="flex gap-2">
            {schedule.map((s) => (
              <div
                key={s.day_number}
                className={`flex-1 text-center border rounded px-2 py-2 ${
                  s.status === 'done'
                    ? 'border-sea-200 bg-sea-50 text-sea-700'
                    : s.status === 'missed'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <p className="text-xs font-medium">Day {s.day_number}</p>
                <p className="text-[10px] mt-0.5">
                  {new Date(s.due_date + 'T00:00:00').toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-[10px] mt-0.5 capitalize">{s.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 max-w-2xl w-full mx-auto">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-10">
            Your nurse will message you here. You can write to them anytime.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 ${
                m.sender === 'patient' ? 'bg-sea-500 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-[10px] mt-0.5 ${m.sender === 'patient' ? 'text-white/70' : 'text-gray-400'}`}>
                {m.sender === 'nurse' ? 'Nurse · ' : ''}
                {timeLabel(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="p-3 border-t border-gray-200 bg-white flex gap-2 max-w-2xl w-full mx-auto"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sea-500 focus:ring-1 focus:ring-sea-500"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="bg-sea-500 text-white text-sm font-medium rounded px-4 py-2 hover:bg-sea-600 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
