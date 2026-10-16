import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@qloo/qloo-harness", "@modelcontextprotocol/sdk"],
  poweredByHeader: false,
  logging: { incomingRequests: { ignore: [/\/auth\/callback/] } },
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;
