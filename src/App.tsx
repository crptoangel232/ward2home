import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Discharge from './pages/Discharge'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'
import PatientChat from './pages/PatientChat'
import { Link, useLocation } from 'react-router-dom'

function Nav() {
  const { signOut } = useAuth()
  const loc = useLocation()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="font-semibold text-[15px] tracking-tight text-sea-600">
          Ward2Home
        </Link>
        <div className="flex items-center gap-5 text-sm text-gray-600">
          <Link
            to="/dashboard"
            className={loc.pathname === '/dashboard' ? 'text-sea-600 font-medium' : 'hover:text-gray-900'}
          >
            Dashboard
          </Link>
          <Link
            to="/messages"
            className={loc.pathname === '/messages' ? 'text-sea-600 font-medium' : 'hover:text-gray-900'}
          >
            Messages
          </Link>
          <Link
            to="/discharge"
            className={loc.pathname === '/discharge' ? 'text-sea-600 font-medium' : 'hover:text-gray-900'}
          >
            Discharge
          </Link>
          <button onClick={signOut} className="hover:text-gray-900">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-sm text-gray-400">Loading</p>
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Nav />
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Nav />
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discharge"
          element={
            <ProtectedRoute>
              <Nav />
              <Discharge />
            </ProtectedRoute>
          }
        />
        {/* Public patient link — no login */}
        <Route path="/p/:token" element={<PatientChat />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
