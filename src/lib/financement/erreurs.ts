// Erreur « normale » (saisie refusée, droit manquant...) : son message est montré tel quel à l'utilisateur.
export class ErreurMetier extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}
