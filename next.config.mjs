/**
 * Next.js config.
 *
 * Static export so the site can be served by any managed host (GitHub Pages,
 * Vercel, S3, …). `basePath` is driven by an env var so the SAME build works
 * at a domain root (Vercel: "") or under a project subpath
 * (GitHub Pages: "/bemos-content-site").
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
