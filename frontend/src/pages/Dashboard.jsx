import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const STATUS_LABELS = { open: 'Ouvert', matched: 'En cours', resolved: 'Résolu', cancelled: 'Annulé' }
const STATUS_COLORS = { open: 'var(--green)', matched: 'var(--blue)', resolved: 'var(--accent)', cancelled: 'var(--muted)' }

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [bets, setBets] = useState([])
  const [txs, setTxs] = useState([])

  const load = () => {
    api.get('/bets/mine').then(r => setBets(r.data))
    api.get('/users/me/transactions').then(r => setTxs(r.data))
    refreshUser()
  }

  useEffect(() => { load() }, [])

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <h1>Dashboard</h1>
        <button onClick={() => navigate('/create')}>+ Proposer un pari</button>
      </div>

      <div className="balance-box">
        <div>
          <div className="balance-label">Solde disponible</div>
          <div className="balance-amount">⚡ {Number(user?.balance ?? 0).toFixed(0)}</div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>crédits virtuels</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Mes Paris</h2>
          {bets.length === 0 && <p className="empty">Aucun pari</p>}
          {bets.map(b => (
            <Link key={b.id} to={`/bet/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--surface2)', borderRadius: 6, marginBottom: '0.4rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>{b.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>⚡ {Number(b.stake).toFixed(0)} · {new Date(b.deadline).toLocaleDateString('fr-FR')}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: STATUS_COLORS[b.status], marginLeft: '0.5rem', flexShrink: 0 }}>{STATUS_LABELS[b.status]}</span>
              </div>
            </Link>
          ))}
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Transactions</h2>
          {txs.length === 0 && <p className="empty">Aucune transaction</p>}
          <div className="tx-list">
            {txs.map(tx => (
              <div key={tx.id} className="tx-row">
                <span className="tx-label">{tx.label}</span>
                <span className={`tx-amount ${tx.amount >= 0 ? 'pos' : 'neg'}`}>
                  {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
