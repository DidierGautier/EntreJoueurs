import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateBet from './pages/CreateBet'
import BetDetail from './pages/BetDetail'
import Admin from './pages/Admin'
import './index.css'

function Nav() {
  const { token, user, logout } = useAuth()
  return (
    <nav className="topnav">
      <Link to="/" className="nav-brand">EntreJoueurs</Link>
      <div className="nav-links">
        <Link to="/">Paris</Link>
        {token && <Link to="/dashboard">Dashboard</Link>}
        {user?.is_admin && <Link to="/admin">Admin</Link>}
      </div>
      {token ? (
        <div className="nav-right">
          <span className="nav-balance">⚡ {Number(user?.balance ?? 0).toFixed(0)} crédits</span>
          <Link to="/dashboard" className="nav-profile">
            <span className="nav-avatar">{user?.email?.[0].toUpperCase()}</span>
            <span className="nav-email">{user?.email}</span>
          </Link>
          <button className="nav-logout" onClick={logout} title="Déconnexion">⏻</button>
        </div>
      ) : (
        <div className="nav-auth">
          <Link to="/login" className="btn-nav-login">Connexion</Link>
          <Link to="/register" className="btn-nav-register">S'inscrire</Link>
        </div>
      )}
    </nav>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bet/:id" element={<BetDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/create" element={<PrivateRoute><CreateBet /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute admin><Admin /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
