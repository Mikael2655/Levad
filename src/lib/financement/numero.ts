// Numéro de demande affiché : le VRAI numéro du financeur (ex. Grenke « 100-145711 ») quand il existe ; sinon la référence interne LEV-AAAA-NNNN.
// Financeur qui reçoit les demandes par e-mail (Solubail...) : le numéro d'ACCORD (ex. 75815IB) dès qu'il est enregistré, avant cela la référence interne.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function numeroAffiche(d: { reference: string; refFinanceur: string | null }, _financeur?: { envoiParMail: boolean }): string {
  const r = d.refFinanceur?.trim()
  if (!r || r === 'ENVOI-EN-COURS' || UUID.test(r)) return d.reference
  return r
}
