import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/grants/us",
        destination: "/grants/federal",
        permanent: true,
      },
      {
        source: "/grants/us/:city/:category/:slug",
        destination: "/grants/federal/:slug",
        permanent: true,
      },
      {
        source: "/grants/us/:city/:category",
        destination: "/grants/federal?category=:category",
        permanent: true,
      },
      {
        source: "/grants/us/:city",
        destination: "/grants/federal",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)/statewide/:category/:slug",
        destination: "/grants/state/:state/:slug",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)/statewide/:category",
        destination: "/grants/state/:state?category=:category",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)/statewide",
        destination: "/grants/state/:state",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)/:city/:category/:slug",
        destination: "/grants/local/:state/:city/:slug",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)/:city/:category",
        destination: "/grants/local/:state/:city?category=:category",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)/:city",
        destination: "/grants/local/:state/:city",
        permanent: true,
      },
      {
        source: "/grants/:state((?!federal|state|local).+)",
        destination: "/grants/state/:state",
        permanent: true,
      },
    ];
  },
};




export default nextConfig;
