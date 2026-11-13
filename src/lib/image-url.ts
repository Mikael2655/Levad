// Image d'un post : null, une adresse https (Unsplash, image IA hébergée) ou une image intégrée (photo importée, image IA).
export const MAX_IMAGE_CHARS = 6_000_000

export function isAcceptableImageUrl(value: unknown): value is string | null | undefined {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return false
  if (value.length > MAX_IMAGE_CHARS) return false
  if (/^https:\/\/[^\s]{3,2000}$/.test(value)) return true
  return /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)
}
