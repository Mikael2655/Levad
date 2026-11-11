// Import d'une photo personnelle : on la réduit dans le navigateur avant de l'envoyer.
// Une photo d'iPhone fait plusieurs Mo, alors que le serveur n'accepte pas plus de 4,5 Mo par envoi
// et que LinkedIn n'a pas besoin de plus de ~1600 px. Le résultat est un JPEG en « data URL ».

const MAX_FILE_BYTES = 30 * 1024 * 1024
const MAX_OUTPUT_CHARS = 3_500_000 // taille maximale du texte base64 renvoyé (~2,6 Mo d'image)

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Format de photo non pris en charge. Utilisez une photo JPEG ou PNG.')) }
    img.src = url
  })
}

export async function fileToJpegDataUrl(file: File, maxSide = 1600): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error('Ce fichier n\'est pas une image.')
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('Photo trop lourde (30 Mo maximum).')

  const img = await loadImage(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) throw new Error('Impossible de lire cette photo.')

  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Impossible de traiter cette photo sur cet appareil.')
  ctx.fillStyle = '#ffffff' // les PNG transparents deviennent fond blanc
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  for (const quality of [0.86, 0.75, 0.62, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_OUTPUT_CHARS) return dataUrl
  }
  throw new Error('Photo trop lourde même après réduction. Essayez une photo plus petite.')
}
