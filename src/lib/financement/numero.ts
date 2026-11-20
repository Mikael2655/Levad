// Numéro de demande affiché : le VRAI numéro du financeur (ex. Grenke « 100-145711 ») quand il existe ; sinon la référence interne LEV-AAAA-NNNN.
// Financeur qui reçoit les demandes par e-mail (Solubail...) : on garde la référence interne, qui sert de référence dans les échanges.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function numeroAffiche(d: { reference: string; refFinanceur: string | null }, financeur: { envoiParMail: boolean }): string {
  const r = d.refFinanceur?.trim()
  if (financeur.envoiParMail || !r || r === 'ENVOI-EN-COURS' || UUID.test(r)) return d.reference
  return r
}
