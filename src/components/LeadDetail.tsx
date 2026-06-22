'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lead, LeadProduct, LeadStatus, LeadSource, PRODUCT_LABELS, STATUS_LABELS, SOURCE_LABELS } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'

export function LeadDetail({ lead }: { lead: Lead }) {
  const router = useRouter()
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, assignedTo }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const deleteLead = async () => {
    if (!confirm('Supprimer ce lead définitivement ?')) return
    setDeleting(true)
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    router.push('/crm')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/crm" className="text-sm text-brand-800 hover:underline">← Retour aux leads</Link>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="bg-brand-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60">
            {saving ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
          <button onClick={deleteLead} disabled={deleting}
            className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-60">
            Supprimer
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-5 text-lg">Informations de contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Prénom', value: lead.firstName },
            { label: 'Nom', value: lead.lastName },
            { label: 'Email', value: lead.email },
            { label: 'Téléphone', value: lead.phone ?? '—' },
            { label: 'Société', value: lead.company ?? '—' },
            { label: 'Fonction', value: lead.jobTitle ?? '—' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">{f.label}</p>
              <p className="text-gray-900">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lead info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-5 text-lg">Détails du lead</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Produit</p>
            <p className="text-gray-900">{PRODUCT_LABELS[lead.product as LeadProduct]}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Source</p>
            <p className="text-gray-900">{SOURCE_LABELS[lead.source as LeadSource]}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Date de création</p>
            <p className="text-gray-900">{new Date(lead.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        {lead.message && (
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Message</p>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">{lead.message}</p>
          </div>
        )}
      </div>

      {/* CRM fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-5 text-lg">Gestion CRM</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value as LeadStatus)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="mt-2"><StatusBadge status={status} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigné à</label>
            <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              placeholder="Nom du commercial..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-600" />
          </div>
        </div>
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
            placeholder="Ajoutez vos notes de suivi..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
      </div>
    </div>
  )
}
