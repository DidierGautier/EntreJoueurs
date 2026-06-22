import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const STATUS_LABELS = { open: 'Ouvert', matched: 'En cours', resolved: 'Résolu', cancelled: 'Annulé' }

function BetCard({ bet }) {
  const entries = bet.entries ?? []
  const sideAUser = entries.find(e => e.side === 'a')
  const sideBUser = entries.find(e => e.side === 'b')
  const deadline = new Date(bet.deadline)
  const isExpired = deadline < new Date()

  return (
    <Link to={`/bet/${bet.id}`} className={`bet-card ${bet.status}`}>
      <div className="bet-main">
        <div className="bet-title">{bet.title}</div>
        <div className="bet-meta">
          <span>{bet.category || 'Général'}</span>
          <span>⏰ {isExpired ? 'Expiré' : deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          {sideAUser && <span>👤 {entries.length}/2 joueurs</span>}
        </div>
      </div>
      <div className="bet-sides">
        <span className="side-chip a">{bet.side_a_label}</span>
        <span className="side-chip b">{bet.side_b_label}</span>
      </div>
      <span className="bet-stake">⚡ {Number(bet.stake).toFixed(0)}</span>
      <span className={`status-badge ${bet.status}`}>{STATUS_LABELS[bet.status]}</span>
    </Link>
  )
}

export default function Home() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [bets, setBets] = useState([])
  const [status, setStatus] = useState('open')

  useEffect(() => {
    api.get(`/bets/?status=${status}`).then(r => setBets(r.data))
  }, [status])

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Paris en cours</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="filter-tabs">
            {['open', 'matched', 'resolved'].map(s => (
              <button key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {token
            ? <button onClick={() => navigate('/create')} style={{ borderRadius: '20px', padding: '0.3rem 1rem' }}>+ Proposer</button>
            : <Link to="/login" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, padding: '0.35rem 1rem', borderRadius: '20px', textDecoration: 'none', fontSize: '0.85rem' }}>+ Proposer un pari</Link>
          }
        </div>
      </div>

      {bets.length === 0
        ? <p className="empty">Aucun pari {STATUS_LABELS[status].toLowerCase()} pour le moment.</p>
        : <div className="bet-grid">{bets.map(b => <BetCard key={b.id} bet={b} />)}</div>
      }
    </div>
  )
}
