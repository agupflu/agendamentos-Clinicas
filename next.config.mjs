/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Type", value: "text/html; charset=UTF-8" },
        ],
      },
    ];
  },
};
export default nextConfig;
