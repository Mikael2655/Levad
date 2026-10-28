import { describe, expect, it } from 'vitest'
import { chiffres, numeroEntrepriseValide, sirenValide } from './siren'
import { lireResultats, rechercherEntreprises } from './entreprises'
import { peutEnvoyerEnSignature, statutsAccessibles } from './statuts'

const admin = { id: 1, role: 'ADMIN' as const }
const assistante = { id: 2, role: 'ASSISTANTE' as const }
const com = { id: 3, role: 'COMMERCIAL' as const }
const d = (statut: string, commercialId = 3) => ({ statut, commercialId })

describe('passages de statut', () => {
  it('l’assistante fait avancer le dossier mais n’annule pas', () => {
    expect(statutsAccessibles(assistante, d('BROUILLON'))).toEqual(['ENVOYEE'])
    expect(statutsAccessibles(assistante, d('ENVOYEE'))).toEqual(['INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'REFUSEE'])
  })
  it('l’admin peut aussi annuler', () => {
    expect(statutsAccessibles(admin, d('ENVOYEE'))).toContain('ANNULEE')
  })
  it('le commercial mène SES demandes jusqu’au bout, mais n’annule que son brouillon', () => {
    expect(statutsAccessibles(com, d('BROUILLON'))).toEqual(['ENVOYEE', 'ANNULEE'])
    expect(statutsAccessibles(com, d('ENVOYEE'))).toEqual(['INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'REFUSEE'])
    expect(statutsAccessibles(com, d('EN_SIGNATURE'))).toEqual(['SIGNEE', 'PRETE_A_SIGNER'])
  })
  it('mais rien sur la demande d’un collègue', () => {
    expect(statutsAccessibles(com, d('BROUILLON', 99))).toEqual([])
    expect(statutsAccessibles(com, d('ENVOYEE', 99))).toEqual([])
  })
  it('tout le monde peut envoyer en signature une demande prête (la sienne pour un commercial)', () => {
    expect(peutEnvoyerEnSignature(com, d('PRETE_A_SIGNER'))).toBe(true)
    expect(peutEnvoyerEnSignature(assistante, d('PRETE_A_SIGNER'))).toBe(true)
    expect(peutEnvoyerEnSignature(com, d('PRETE_A_SIGNER', 99))).toBe(false)
    expect(peutEnvoyerEnSignature(com, d('ENVOYEE'))).toBe(false)
  })
  it('« En signature » n’est jamais un simple bouton ; signée et annulée sont définitifs', () => {
    expect(statutsAccessibles(admin, d('PRETE_A_SIGNER'))).toEqual(['ANNULEE'])
    expect(statutsAccessibles(admin, d('EN_SIGNATURE'))).toEqual(['SIGNEE', 'PRETE_A_SIGNER', 'ANNULEE'])
    expect(statutsAccessibles(admin, d('SIGNEE'))).toEqual([])
    expect(statutsAccessibles(admin, d('ANNULEE'))).toEqual([])
  })
})

describe('numéros d’entreprise', () => {
  it('clé du SIREN contrôlée', () => {
    expect(sirenValide('356000000')).toBe(true)
    expect(sirenValide('356000001')).toBe(false)
    expect(sirenValide('12345')).toBe(false)
  })
  it('SIRET : 14 chiffres dont le SIREN est valide ; espaces tolérés', () => {
    expect(numeroEntrepriseValide('356 000 000 00048')).toBe(true)
    expect(numeroEntrepriseValide('356000001 00048')).toBe(false)
    expect(chiffres('356 000 000')).toBe('356000000')
  })
})

// Réponse imaginée d'après la documentation publique de l'API (non vérifiée en direct).
const REPONSE = {
  results: [
    { siren: '356000000', nom_complet: 'ACME SAS', nature_juridique: '5710', etat_administratif: 'A', nombre_etablissements_ouverts: 2, siege: { siret: '35600000000048', adresse: '6 RUE DU PORT 67300 SCHILTIGHEIM', code_postal: '67300', libelle_commune: 'SCHILTIGHEIM' } },
    { siren: '111111118', nom_complet: 'ANCIENNE SARL', nature_juridique: '5499', etat_administratif: 'C', siege: {} },
    { pas: 'un résultat' },
  ],
}

describe('lecture de la réponse de la recherche', () => {
  it('extrait siren, siret du siège, rue sans code postal ni ville, forme juridique', () => {
    const [e, ...reste] = lireResultats(REPONSE)
    expect(e).toMatchObject({ siren: '356000000', siret: '35600000000048', nom: 'ACME SAS', adresse: '6 RUE DU PORT', codePostal: '67300', ville: 'SCHILTIGHEIM', formeJuridique: 'SAS', nbEtablissements: 2 })
    expect(reste).toEqual([]) // société cessée et ligne illisible écartées
  })
  it('tolère l’absence de champs', () => {
    expect(lireResultats({ results: [{ siren: '356000000', siege: {} }] })[0]).toMatchObject({ nom: '', adresse: '', formeJuridique: '' })
    expect(lireResultats({})).toEqual([])
  })
  it('ne contacte pas le service pour moins de 3 caractères', async () => {
    const appeler = (() => { throw new Error('ne doit pas être appelé') }) as unknown as typeof fetch
    expect(await rechercherEntreprises('ab', appeler)).toEqual([])
  })
  it('service en panne : message clair', async () => {
    const appeler = (async () => new Response('', { status: 500 })) as typeof fetch
    await expect(rechercherEntreprises('acme', appeler)).rejects.toThrow('momentanément indisponible')
  })
})
