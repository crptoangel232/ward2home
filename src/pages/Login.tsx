import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('Account created. Check your email for a confirmation link, then sign in.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h1 className="text-xl font-semibold tracking-tight">Ward2Home</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            {mode === 'signin' ? 'Sign in to manage patient follow-ups.' : 'Create a nurse account.'}
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sea-500 focus:ring-1 focus:ring-sea-500"
                placeholder="you@hospital.sl"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sea-500 focus:ring-1 focus:ring-sea-500"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-sea-500 text-white text-sm font-medium rounded px-3 py-2.5 hover:bg-sea-600 disabled:opacity-50"
            >
              {busy ? 'Please wait' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            {mode === 'signin' ? (
              <>
                Need an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-sea-600 font-medium hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-sea-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          Post-discharge patient tracking. Sierra Leone.
        </p>
      </div>
    </div>
  )
}
