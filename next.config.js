/** @type {import('next').NextConfig} */
const nextConfig = {
  // exceljs (export Excel) est chargé tel quel sur le serveur plutôt qu'empaqueté
  experimental: { serverComponentsExternalPackages: ['exceljs'] },
}

module.exports = nextConfig
