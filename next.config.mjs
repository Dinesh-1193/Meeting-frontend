/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Polling avoids corrupted .next chunks on Windows when file watchers
      // hit system files (pagefile.sys) and leave webpack mid-write.
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/pagefile.sys",
          "**/DumpStack.log.tmp",
          "**/hiberfil.sys",
          "**/System Volume Information/**",
          "**/$Recycle.Bin/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
