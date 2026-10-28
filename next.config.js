/** @type {import('next').NextConfig} */
const nextConfig = {
  // exceljs (export Excel) est chargé tel quel sur le serveur plutôt qu'empaqueté
  // staleTimes.dynamic = 0 : les pages (liste des demandes, contrats...) sont toujours relues au serveur, jamais servies depuis le cache de navigation
  experimental: { serverComponentsExternalPackages: ['exceljs'], staleTimes: { dynamic: 0 } },
}

module.exports = nextConfig
