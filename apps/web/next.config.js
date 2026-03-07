/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@signalwave/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
};

module.exports = nextConfig;
