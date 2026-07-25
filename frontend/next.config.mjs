/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /features and /product were LeadPulse's marketing pages from when it was
  // the whole company's identity. LeadPulse is now one NorthQu offering,
  // consolidated at /services/leadpulse — these redirect there so no old
  // links or bookmarks 404.
  async redirects() {
    return [
      { source: '/features', destination: '/services/leadpulse', permanent: true },
      { source: '/product', destination: '/services/leadpulse', permanent: true },
    ];
  },
};
export default nextConfig;
