import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" é usado pelo Dockerfile (Kubernetes, T29) e pelo servidor de
  // E2E (docs/guides/nfr-validation.md). Na Vercel o builder já empacota a
  // função serverless sozinho; manter "standalone" ligado lá quebra o build
  // com ENOENT em .next/next-server.js.nft.json.
  output: process.env.VERCEL ? undefined : "standalone",
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
