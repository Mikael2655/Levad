// Modèle d'une ligne de matériel vierge. Dans un fichier neutre : défini dans un composant « use client » puis importé par une
// page serveur, il arriverait vide (Next.js ne transmet qu'une référence au composant).
export interface LigneForm { designation: string; quantite: string; montantHt: string; typeBien: string; constructeur: string }

export const nouvelleLigne = (): LigneForm => ({ designation: '', quantite: '1', montantHt: '', typeBien: '', constructeur: '' })
