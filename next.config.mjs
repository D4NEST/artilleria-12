/** @type {import('next').NextConfig} */
const nextConfig = {
  // Se desactiva el "ignoreBuildErrors": esconder los errores de tipos fue
  // parte de por qué el proyecto compilaba pero no funcionaba. `pnpm build`
  // vuelve a ser una red de seguridad real.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
