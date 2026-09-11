import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
};

export default nextConfig;
