// LinkedIn et Instagram n'acceptent aucune mise en forme dans un post publié par un outil.
// Le « gras » que l'on voit partout est fait de lettres Unicode (alphabet mathématique gras sans empattement),
// qui s'affichent en gras partout. Unicode n'a pas de lettres accentuées en gras : on garde la lettre de base
// en gras et on lui recolle son accent (caractère combinant).

const BOLD_UPPER = 0x1d5d4 // 𝗔
const BOLD_LOWER = 0x1d5ee // 𝗮
const BOLD_DIGIT = 0x1d7ec // 𝟬

export function isBold(text: string): boolean {
  return Array.from(text).some(ch => {
    const c = ch.codePointAt(0) as number
    return (c >= BOLD_UPPER && c <= BOLD_LOWER + 25) || (c >= BOLD_DIGIT && c <= BOLD_DIGIT + 9)
  })
}

export function toBold(text: string): string {
  let out = ''
  for (const ch of Array.from(text.normalize('NFD'))) {
    const c = ch.codePointAt(0) as number
    if (c >= 65 && c <= 90) out += String.fromCodePoint(BOLD_UPPER + c - 65)
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(BOLD_LOWER + c - 97)
    else if (c >= 48 && c <= 57) out += String.fromCodePoint(BOLD_DIGIT + c - 48)
    else out += ch
  }
  return out
}

export function fromBold(text: string): string {
  let out = ''
  for (const ch of Array.from(text)) {
    const c = ch.codePointAt(0) as number
    if (c >= BOLD_UPPER && c <= BOLD_UPPER + 25) out += String.fromCharCode(65 + c - BOLD_UPPER)
    else if (c >= BOLD_LOWER && c <= BOLD_LOWER + 25) out += String.fromCharCode(97 + c - BOLD_LOWER)
    else if (c >= BOLD_DIGIT && c <= BOLD_DIGIT + 9) out += String.fromCharCode(48 + c - BOLD_DIGIT)
    else out += ch
  }
  return out.normalize('NFC')
}

// Bascule : si la sélection contient déjà du gras, on l'enlève ; sinon on la met en gras.
export function toggleBold(text: string): string {
  return isBold(text) ? fromBold(text) : toBold(text)
}

// Permet d'écrire **mot** dans un texte : converti en gras Unicode à l'aperçu et à la publication.
export function applyBoldMarkup(text: string): string {
  return text.replace(/\*\*([^*\n]+)\*\*/g, (_, inner: string) => toBold(inner))
}
