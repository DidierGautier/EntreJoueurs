import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function CreateBet() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    side_a_label: 'Pour',
    side_b_label: 'Contre',
    stake: '',
    deadline: '',
    creator_side: 'a',
  })
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, stake: parseFloat(form.stake) }
      const r = await api.post('/bets/', payload)
      refreshUser()
      navigate(`/bet/${r.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création')
    }
  }

  const minDate = new Date()
  minDate.setMinutes(minDate.getMinutes() + 5)
  const minDateStr = minDate.toISOString().slice(0, 16)

  return (
    <div className="create-page">
      <h1>Proposer un pari</h1>
      <form className="form-card" onSubmit={submit}>
        <div className="field">
          <label>Titre du pari *</label>
          <input placeholder="Ex: Le PSG gagnera la Ligue des Champions cette saison" value={form.title} onChange={e => set('title', e.target.value)} required />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea placeholder="Précisions, règles du pari…" value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
        </div>
        <div className="field">
          <label>Catégorie</label>
          <input placeholder="Sport, Politique, Tech…" value={form.category} onChange={e => set('category', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="field">
            <label>Libellé côté A</label>
            <input value={form.side_a_label} onChange={e => set('side_a_label', e.target.value)} required />
          </div>
          <div className="field">
            <label>Libellé côté B</label>
            <input value={form.side_b_label} onChange={e => set('side_b_label', e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label>Mon côté *</label>
          <div className="side-selector">
            <div className={`side-opt ${form.creator_side === 'a' ? 'sel-a' : ''}`} onClick={() => set('creator_side', 'a')}>
              {form.side_a_label || 'Côté A'}
            </div>
            <div className={`side-opt ${form.creator_side === 'b' ? 'sel-b' : ''}`} onClick={() => set('creator_side', 'b')}>
              {form.side_b_label || 'Côté B'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="field">
            <label>Mise (crédits) *</label>
            <input type="number" min="1" step="1" placeholder="100" value={form.stake} onChange={e => set('stake', e.target.value)} required />
          </div>
          <div className="field">
            <label>Deadline *</label>
            <input type="datetime-local" min={minDateStr} value={form.deadline} onChange={e => set('deadline', e.target.value)} required />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Proposer le pari</button>
      </form>
    </div>
  )
}
