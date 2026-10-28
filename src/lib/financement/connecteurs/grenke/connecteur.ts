// Connecteur Grenke API. Lecture seule pour l'instant : l'envoi réel de demandes, de pièces et de signatures sera activé
// après les essais, quand Grenke aura été prévenu (il n'existe pas d'environnement de test : tout se passe en production).
import { ErreurMetier } from '../../erreurs'
import type { Connecteur, ContratFinanceur, EtatDemande } from '../connecteur'
import { listerContrats, lireDemande } from './api'
import type { ConfigGrenke } from './config'
import { versStatutCommun } from './statuts'

const pasEncore = (action: string) => new ErreurMetier(`${action} : l’envoi réel vers Grenke n’est pas encore activé.`, 501)

export function creerConnecteurGrenke(config: ConfigGrenke): Connecteur {
  return {
    code: 'grenke_api',
    creerDemande: async () => { throw pasEncore('Création de la demande') },
    envoyerPiece: async () => { throw pasEncore('Envoi de la pièce') },
    lancerSignature: async () => { throw pasEncore('Lancement de la signature') },
    recupererContratSigne: async () => { throw pasEncore('Récupération du contrat signé') },

    async recupererStatut(referenceFinanceur): Promise<EtatDemande | null> {
      const d = await lireDemande(config, referenceFinanceur)
      const c = versStatutCommun(String(d.State ?? ''))
      return c ? { statut: c.statut, etapeSignature: c.etape, detail: c.detail, codeFinanceur: String(d.State) } : null
    },

    async listerContrats(): Promise<ContratFinanceur[]> {
      const sortie: ContratFinanceur[] = []
      for (let page = 1; ; page++) {
        const r = await listerContrats(config, { page, pageSize: 100 })
        for (const c of r.items) {
          sortie.push({
            reference: String(c.ContractId ?? ''), etatBrut: String(c.State ?? ''), client: String(c.Lessee?.CompanyName ?? ''),
            loyerMensuelCentimes: typeof c.TotalInstalment === 'number' ? Math.round(c.TotalInstalment * 100) : null,
            dureeMois: Number(c.Period ?? 0), montantFinanceCentimes: typeof c.NetAcquisitionValue === 'number' ? Math.round(c.NetAcquisitionValue * 100) : null,
            dateDebut: c.StartDate ? new Date(c.StartDate) : null, dateFin: c.EndDate ? new Date(c.EndDate) : null,
          })
        }
        if (page >= r.pageCount) return sortie
      }
    },
  }
}
