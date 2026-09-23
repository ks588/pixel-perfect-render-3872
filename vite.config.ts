import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Replace "kelly-felder-prototype" with your exact GitHub repository name
  base: "/kelly-felder-prototype/",
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
    // Forces TanStack Start to prerender static HTML for GitHub Pages
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
  },
});