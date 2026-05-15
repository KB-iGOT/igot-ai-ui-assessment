import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
 
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/ai-assessment',
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 8080,

    proxy: {
      "/api": {
        target: "https://portal.uat.karmayogibharat.net",
        changeOrigin: true,
        secure: false,

        headers: {
          Cookie:
            "connect.sid=s%3Ayo067u7pIvXRi0N8jF8aRsqt5Lk6cosu.cESkOJrdIALqR05ohJQlkeNddpB6ZZc%2F2nTR8yEssYM",
        },
      },
      "/assessments": {
        target: "https://portal.uat.karmayogibharat.net",
        changeOrigin: true,
        secure: false,

        headers: {
          Cookie:
            "connect.sid=s%3Ayo067u7pIvXRi0N8jF8aRsqt5Lk6cosu.cESkOJrdIALqR05ohJQlkeNddpB6ZZc%2F2nTR8yEssYM",
        },
      },

      "/apis": {
        target: "https://portal.uat.karmayogibharat.net",
        changeOrigin: true,
        secure: false,

        headers: {
          Cookie:
            "connect.sid=s%3Ayo067u7pIvXRi0N8jF8aRsqt5Lk6cosu.cESkOJrdIALqR05ohJQlkeNddpB6ZZc%2F2nTR8yEssYM",
        },
      },

      "/ai-assment-generation": {
        target: "https://portal.uat.karmayogibharat.net",
        changeOrigin: true,
        secure: false,

        headers: {
          Cookie:
            "connect.sid=s%3Ayo067u7pIvXRi0N8jF8aRsqt5Lk6cosu.cESkOJrdIALqR05ohJQlkeNddpB6ZZc%2F2nTR8yEssYM",
        },
      },


    },
  },
}));