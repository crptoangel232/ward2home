import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Patient = {
  id: string
  full_name: string
  phone: string
  risk_level: string
  last_message: string | null
  last_at: string | null
  unread: number
}

type Message = {
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

export default function Messages() {
  const [params, setParams] = useSearchParams()
  const activeId = params.get('patient')
  const [patients, setPatients] = useState<Patient[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchPatients = useCallback(async () => {
    const { data: pts, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, risk_level')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setLoading(false)
      return
    }
    const { data: msgs, error: mErr } = await supabase
      .from('messages')
      .select('patient_id, sender, body, created_at, read_by_nurse')
      .order('created_at', { ascending: false })
    if (mErr) console.error(mErr)

    const byPatient = new Map<string, { last: Message; unread: number }>()
    for (const m of (msgs as any[]) || []) {
      const cur = byPatient.get(m.patient_id as string)
      if (!cur) {
        byPatient.set(m.patient_id as string, {
          last: { id: m.id, sender: m.sender, body: m.body, created_at: m.created_at },
          unread: m.sender === 'patient' && !m.read_by_nurse ? 1 : 0,
        })
      } else if (m.sender === 'patient' && !m.read_by_nurse) {
        cur.unread += 1
      }
    }

    const list: Patient[] = (pts || []).map((p: any) => {
      const entry = byPatient.get(p.id)
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        risk_level: p.risk_level,
        last_message: entry?.last.body ?? null,
        last_at: entry?.last.created_at ?? null,
        unread: entry?.unread ?? 0,
      }
    })
    setPatients(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPatients()
    const channel = supabase
      .channel('nurse-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchPatients()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPatients])

  const fetchMessages = useCallback(async (patientId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender, body, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error(error)
      return
    }
    setMessages(data || [])
  }, [])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    fetchMessages(activeId)
    // Mark patient messages as read
    supabase
      .from('messages')
      .update({ read_by_nurse: true })
      .eq('patient_id', activeId)
      .eq('sender', 'patient')
      .eq('read_by_nurse', false)
      .then(() => fetchPatients())

    const channel = supabase
      .channel(`conversation-${activeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${activeId}`,
        },
        (payload: any) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...prev, payload.new as Message]
          )
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeId, fetchMessages, fetchPatients])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || !activeId) return
    setSending(true)
    setDraft('')
    const { error } = await supabase
      .from('messages')
      .insert({ patient_id: activeId, sender: 'nurse', body, read_by_nurse: true })
    if (error) console.error(error)
    setSending(false)
    fetchMessages(activeId)
    fetchPatients()
  }

  const active = patients.find((p) => p.id === activeId)

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight mb-5">Messages</h1>

      {loading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading</p>
      ) : patients.length === 0 ? (
        <div className="text-center py-14 text-sm text-gray-400">
          No patients yet. Register a patient from the Discharge page first.
        </div>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          {/* Inbox */}
          <div
            className={`bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 md:max-h-[70vh] md:overflow-y-auto ${
              activeId ? 'hidden md:block' : ''
            }`}
          >
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setParams({ patient: p.id })}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                  p.id === activeId ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  {p.unread > 0 && (
                    <span className="shrink-0 bg-sea-500 text-white text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {p.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {p.last_message ? p.last_message : 'No messages yet'}
                </p>
                {p.last_at && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{timeLabel(p.last_at)}</p>
                )}
              </button>
            ))}
          </div>

          {/* Conversation */}
          {activeId && active ? (
            <div className="bg-white border border-gray-200 rounded-lg flex flex-col h-[70vh]">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{active.full_name}</p>
                  <p className="text-xs text-gray-500">{active.phone}</p>
                </div>
                <button
                  onClick={() => setParams({})}
                  className="md:hidden text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-3 py-1.5"
                >
                  Back
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-10">
                    No messages yet. Say hello — the patient sees this instantly on their link.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === 'nurse' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        m.sender === 'nurse'
                          ? 'bg-sea-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`text-[10px] mt-0.5 ${m.sender === 'nurse' ? 'text-white/70' : 'text-gray-400'}`}>
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
                className="p-3 border-t border-gray-100 flex gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sea-500 focus:ring-1 focus:ring-sea-500"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="bg-sea-500 text-white text-sm font-medium rounded px-4 py-2 hover:bg-sea-600 disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden md:flex bg-white border border-gray-200 rounded-lg items-center justify-center">
              <p className="text-sm text-gray-400">Select a patient to open the conversation.</p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
