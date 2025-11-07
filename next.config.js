/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable production optimizations
  swcMinify: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Production compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      'lokijs': false,
      'encoding': false,
    }

    // Ignore specific modules that are not needed
    config.externals.push({
      'pino-pretty': 'pino-pretty',
      'lokijs': 'lokijs',
      'encoding': 'encoding',
    })

    return config
  },
}

module.exports = nextConfig
