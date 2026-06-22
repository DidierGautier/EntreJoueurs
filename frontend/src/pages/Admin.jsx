import { useState, useEffect } from 'react'
import api from '../api/client'

export default function Admin() {
  const [bets, setBets] = useState([])
  const [msg, setMsg] = useState({ text: '', err: false })
  const [loading, setLoading] = useState({})

  const load = () => api.get('/admin/bets').then(r => setBets(r.data))
  useEffect(() => { load() }, [])

  const flash = (text, err = false) => { setMsg({ text, err }); setTimeout(() => setMsg({ text: '', err: false }), 5000) }

  const resolve = async (id, result) => {
    try {
      await api.patch(`/admin/bets/${id}/resolve`, { result })
      flash('Pari résolu manuellement.')
      load()
    } catch (err) { flash(err.response?.data?.detail || 'Erreur', true) }
  }

  const aiResolve = async (id) => {
    setLoading(l => ({ ...l, [id]: true }))
    try {
      const r = await api.post(`/admin/bets/${id}/ai-resolve`)
      flash(`🤖 ${r.data.detail}`)
      load()
    } catch (err) {
      flash(err.response?.data?.detail || 'Erreur IA', true)
    } finally {
      setLoading(l => ({ ...l, [id]: false }))
    }
  }

  return (
    <div className="admin-page">
      <h1>Administration — Résolution des paris</h1>
      {msg.text && <div className={`flash ${msg.err ? 'err' : ''}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}
      {bets.length === 0 && <p className="empty">Aucun pari en cours à résoudre.</p>}
      {bets.map(b => (
        <div key={b.id} className="admin-bet-card">
          <div className="admin-bet-title">{b.title}</div>
          <div className="admin-bet-info">
            {b.description && <span style={{ display: 'block', marginBottom: '0.25rem' }}>{b.description}</span>}
            Mise : ⚡ {Number(b.stake).toFixed(0)} · Deadline : {new Date(b.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="resolve-btns">
            <button className="btn-resolve-a" onClick={() => resolve(b.id, 'a')}>🏆 {b.side_a_label}</button>
            <button className="btn-resolve-b" onClick={() => resolve(b.id, 'b')}>🏆 {b.side_b_label}</button>
            <button
              className="btn-ai-resolve"
              onClick={() => aiResolve(b.id)}
              disabled={loading[b.id]}
            >
              {loading[b.id] ? '⏳ ChatGPT…' : '🤖 Résoudre avec ChatGPT'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
