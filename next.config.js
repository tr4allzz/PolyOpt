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
    // Optimize package imports for faster compilation - add heavy packages
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@tanstack/react-query',
      '@tanstack/react-virtual',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-slider',
      '@radix-ui/react-progress',
      'viem',
      'wagmi',
      'ethers',
    ],
  },

  webpack: (config, { isServer, dev }) => {
    // Speed up development compilation
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      }

      // Reduce source map quality in dev for faster builds
      config.devtool = 'eval-cheap-module-source-map'
    }

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

  // Keep more pages in memory to reduce recompilation
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,  // 2 minutes
    pagesBufferLength: 5,        // Keep 5 pages in memory
  },
}

module.exports = nextConfig
