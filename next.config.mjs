/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false }
    return config
  },
}

export default nextConfig
