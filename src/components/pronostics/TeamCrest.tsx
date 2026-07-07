'use client'

import { useState } from 'react'

export function TeamCrest({ src, alt, size = 24 }: { src: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
