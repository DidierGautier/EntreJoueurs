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
  const [validation, setValidation] = useState(null) // { valid, reason }
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setValidation(null) // reset validation si le formulaire change
  }

  const validate = async () => {
    if (!form.title || !form.side_a_label || !form.side_b_label) {
      setError('Remplis au minimum le titre et les deux côtés.')
      return
    }
    setError('')
    setValidating(true)
    setValidation(null)
    try {
      const r = await api.post('/bets/validate', {
        title: form.title,
        description: form.description,
        side_a_label: form.side_a_label,
        side_b_label: form.side_b_label,
      })
      setValidation(r.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de validation')
    } finally {
      setValidating(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validation?.valid) return
    setError('')
    setSubmitting(true)
    try {
      const payload = { ...form, stake: parseFloat(form.stake) }
      const r = await api.post('/bets/', payload)
      refreshUser()
      navigate(`/bet/${r.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
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

        {/* Résultat de validation */}
        {validation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className={`validation-result ${validation.valid ? 'valid' : 'invalid'}`}>
              <span className="validation-icon">{validation.valid ? '✅' : '❌'}</span>
              <span>{validation.reason}</span>
            </div>
            {validation.valid && validation.suggested_deadline && (
              <div className="validation-result deadline-suggestion">
                <span className="validation-icon">📅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '0.35rem' }}>{validation.deadline_reason}</div>
                  <button
                    type="button"
                    className="btn-use-deadline"
                    onClick={() => set('deadline', validation.suggested_deadline.slice(0, 16))}
                  >
                    Utiliser : {new Date(validation.suggested_deadline).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bouton valider ou soumettre */}
        {!validation?.valid ? (
          <button type="button" className="btn-validate-ai" onClick={validate} disabled={validating}>
            {validating ? '⏳ Vérification…' : '🤖 Vérifier avec ChatGPT'}
          </button>
        ) : (
          <button type="submit" disabled={submitting}>
            {submitting ? '⏳ Création…' : '✅ Confirmer et proposer le pari'}
          </button>
        )}
      </form>
    </div>
  )
}
