import type { NextConfig } from "next";
import { NextPublicTsPlugin } from "next-public";
import createNextIntlPlugin from 'next-intl/plugin';
import path from "node:path";
const __dirname = new URL(".", import.meta.url).pathname;

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.plugins.push(
      new NextPublicTsPlugin({
        inputDir: path.join(__dirname, 'src', 'workers'),
        outputDir: path.join(__dirname, 'public'),
      })
    );
    return config;
  }
};

import withBundleAnalyzer from '@next/bundle-analyzer'
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(withNextIntl(nextConfig));
