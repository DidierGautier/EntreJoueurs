import { useState, useEffect } from 'react'
import api from '../api/client'

export default function Admin() {
  const [bets, setBets] = useState([])
  const [msg, setMsg] = useState('')

  const load = () => api.get('/admin/bets').then(r => setBets(r.data))
  useEffect(() => { load() }, [])

  const resolve = async (id, result) => {
    try {
      await api.patch(`/admin/bets/${id}/resolve`, { result })
      setMsg('Pari résolu')
      setTimeout(() => setMsg(''), 3000)
      load()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Erreur')
    }
  }

  return (
    <div className="admin-page">
      <h1>Administration — Résolution des paris</h1>
      {msg && <div className="flash" style={{ marginBottom: '1rem' }}>{msg}</div>}
      {bets.length === 0 && <p className="empty">Aucun pari en cours à résoudre.</p>}
      {bets.map(b => (
        <div key={b.id} className="admin-bet-card">
          <div className="admin-bet-title">{b.title}</div>
          <div className="admin-bet-info">
            Mise : ⚡ {Number(b.stake).toFixed(0)} · Deadline : {new Date(b.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="resolve-btns">
            <button className="btn-resolve-a" onClick={() => resolve(b.id, 'a')}>🏆 {b.side_a_label}</button>
            <button className="btn-resolve-b" onClick={() => resolve(b.id, 'b')}>🏆 {b.side_b_label}</button>
          </div>
        </div>
      ))}
    </div>
  )
}
