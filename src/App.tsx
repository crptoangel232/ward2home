import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Discharge from './pages/Discharge'
import Dashboard from './pages/Dashboard'
import { Stethoscope } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

function Nav() {
  const { session, signOut } = useAuth()
  const loc = useLocation()

  if (!session) return null

  return (
    <nav className="bg-sea-500 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Stethoscope size={24} />
          <Link to="/dashboard">Ward2Home</Link>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/dashboard" className={loc.pathname === '/dashboard' ? 'font-semibold underline' : 'opacity-80'}>
            Dashboard
          </Link>
          <Link to="/discharge" className={loc.pathname === '/discharge' ? 'font-semibold underline' : 'opacity-80'}>
            Discharge
          </Link>
          <button onClick={signOut} className="opacity-80 hover:opacity-100">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center h-screen"><p className="text-gray-400">Loading...</p></div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/discharge" element={<ProtectedRoute><Discharge /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
