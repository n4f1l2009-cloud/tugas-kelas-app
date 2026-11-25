import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Mengizinkan optimasi gambar jika suatu saat ingin migrasi dari <img> ke <Image>
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
