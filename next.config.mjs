/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site into ./out when running `next build`.
  output: 'export',

  // Static hosts usually serve directories, so `/about/` maps to
  // out/about/index.html. Keeping trailing slashes avoids 404s on such hosts.
  trailingSlash: true,

  // The default image optimiser needs a server at runtime, which a static
  // export does not have.
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,
};

export default nextConfig;
