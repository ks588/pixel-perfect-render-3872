import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Make sure this matches your exact GitHub repository name
  base: "/kelly-felder-prototype/",
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
    // Enable static HTML generation so GitHub Pages has an index.html to serve
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
  },
});