import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://peter-zyx.github.io",
  base: process.env.SITE_BASE_PATH || "/"
});
