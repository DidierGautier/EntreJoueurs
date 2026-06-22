import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function BetDetail() {
  const { id } = useParams()
  const { token, user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [bet, setBet] = useState(null)
  const [msg, setMsg] = useState({ text: '', err: false })

  const load = () => api.get(`/bets/${id}`).then(r => setBet(r.data))

  useEffect(() => { load() }, [id])

  const flash = (text, err = false) => { setMsg({ text, err }); setTimeout(() => setMsg({ text: '', err: false }), 3000) }

  const accept = async () => {
    try {
      await api.post(`/bets/${id}/accept`)
      flash('Pari accepté !')
      load()
      refreshUser()
    } catch (err) { flash(err.response?.data?.detail || 'Erreur', true) }
  }

  const cancel = async () => {
    if (!confirm('Annuler ce pari ?')) return
    try {
      await api.delete(`/bets/${id}`)
      flash('Pari annulé')
      setTimeout(() => navigate('/'), 1000)
    } catch (err) { flash(err.response?.data?.detail || 'Erreur', true) }
  }

  if (!bet) return <div className="bet-detail-page"><p className="empty">Chargement…</p></div>

  const entries = bet.entries ?? []
  const sideAEntry = entries.find(e => e.side === 'a')
  const sideBEntry = entries.find(e => e.side === 'b')
  const myEntry = entries.find(e => e.user_id === user?.id)
  const opponentSide = bet.creator_side === 'a' ? 'b' : 'a'
  const isCreator = user?.id === bet.creator_id
  const canAccept = token && !isCreator && bet.status === 'open' && !myEntry && new Date() < new Date(bet.deadline)
  const canCancel = isCreator && bet.status === 'open'
  const deadline = new Date(bet.deadline)

  const resultLabel = bet.result === 'a' ? bet.side_a_label : bet.result === 'b' ? bet.side_b_label : null

  return (
    <div className="bet-detail-page">
      <Link to="/" className="back-link">← Retour aux paris</Link>

      {msg.text && <div className={`flash ${msg.err ? 'err' : ''}`}>{msg.text}</div>}

      <div className="bet-detail-card">
        <span className={`status-badge ${bet.status}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
          {{ open: 'Ouvert', matched: 'En cours', resolved: 'Résolu', cancelled: 'Annulé' }[bet.status]}
        </span>
        <h1>{bet.title}</h1>
        {bet.description && <p className="bet-description">{bet.description}</p>}

        <div className="bet-info-row">
          {bet.category && <span>📂 <strong>{bet.category}</strong></span>}
          <span>⚡ Mise : <strong>{Number(bet.stake).toFixed(0)} crédits</strong></span>
          <span>🏆 Pot : <strong>{(Number(bet.stake) * 2).toFixed(0)} crédits</strong></span>
          <span>⏰ <strong>{deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
        </div>

        {resultLabel && (
          <div className={`flash`} style={{ marginBottom: '1rem' }}>
            🏆 Résultat : <strong>{resultLabel}</strong>
          </div>
        )}

        <div className="sides-display">
          <div className={`side-box a ${bet.result === 'a' ? 'winner' : ''}`}>
            <div className="side-label">{bet.side_a_label}</div>
            <div className="side-player">{sideAEntry ? '👤 En jeu' : '— Libre'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)', fontWeight: 700 }}>VS</div>
          <div className={`side-box b ${bet.result === 'b' ? 'winner' : ''}`}>
            <div className="side-label">{bet.side_b_label}</div>
            <div className="side-player">{sideBEntry ? '👤 En jeu' : '— Libre'}</div>
          </div>
        </div>

        {canAccept && (
          <button className="btn-accept" onClick={accept}>
            Accepter — jouer « {opponentSide === 'a' ? bet.side_a_label : bet.side_b_label} » (⚡ {Number(bet.stake).toFixed(0)} crédits)
          </button>
        )}

        {canCancel && (
          <button className="btn-cancel-bet" onClick={cancel}>Annuler mon pari</button>
        )}

        {myEntry && bet.status !== 'resolved' && (
          <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            Vous jouez : <strong style={{ color: myEntry.side === 'a' ? 'var(--green)' : 'var(--red)' }}>
              {myEntry.side === 'a' ? bet.side_a_label : bet.side_b_label}
            </strong>
          </p>
        )}
      </div>

      {!token && (
        <div className="login-cta">
          <p>Connectez-vous pour participer à ce pari.</p>
          <Link to={`/login`}>Se connecter</Link> · <Link to="/register">Créer un compte (⚡ 1 000 crédits offerts)</Link>
        </div>
      )}
    </div>
  )
}
