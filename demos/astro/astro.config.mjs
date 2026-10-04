import { defineConfig } from "astro/config";

export default defineConfig({
  server: { port: 5175 },
  devToolbar: { enabled: false },
  vite: { server: { strictPort: true }, preview: { strictPort: true } },
});
