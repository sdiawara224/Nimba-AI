/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Autorise les hôtes d'aperçu distants (Arena, Vercel) pour le serveur de dev.
  // En production, renseignez NEXT_PUBLIC_APP_URL à la place.
  allowedDevOrigins: ['*.e2b.app', '*.vercel.app'],
};

export default nextConfig;
