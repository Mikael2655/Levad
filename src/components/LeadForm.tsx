'use client'

import { useState } from 'react'
import { PRODUCT_LABELS } from '@/lib/types'

export function LeadForm() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    company: '', jobTitle: '', product: '', message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      setSuccess(true)
      setForm({ firstName: '', lastName: '', email: '', phone: '', company: '', jobTitle: '', product: '', message: '' })
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Demande envoyée !</h3>
        <p className="text-green-700 mb-6">Un conseiller Levad vous contactera dans les plus brefs délais.</p>
        <button onClick={() => setSuccess(false)} className="bg-brand-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition">
          Nouvelle demande
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input name="phone" type="tel" value={form.phone} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Société</label>
          <input name="company" value={form.company} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
          <input name="jobTitle" value={form.jobTitle} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domaine d&apos;intérêt *</label>
        <select name="product" value={form.product} onChange={handleChange} required
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white">
          <option value="">Sélectionnez un domaine...</option>
          {Object.entries(PRODUCT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea name="message" value={form.message} onChange={handleChange} rows={4}
          placeholder="Décrivez votre besoin..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-brand-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-brand-700 transition disabled:opacity-60">
        {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
      </button>
    </form>
  )
}
