import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children, admin = false }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (admin && user && !user.is_admin) return <Navigate to="/" replace />
  return children
}
