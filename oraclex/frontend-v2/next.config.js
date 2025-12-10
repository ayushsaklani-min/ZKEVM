/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.oraclex.io', 'ipfs.io', 'gateway.pinata.cloud'],
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      '@react-native-async-storage/async-storage': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
    ];
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
