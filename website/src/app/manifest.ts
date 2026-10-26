import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OmniDrop — Wire-Speed P2P Mesh Fabric",
    short_name: "OmniDrop",
    description:
      "Ultra-High-Throughput P2P File & Stream Transport for Mobile & Desktop. Zero Cloud, Zero Install, Direct WebRTC.",
    start_url: "/app",
    scope: "/",
    id: "/app",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#050811",
    theme_color: "#050811",
    orientation: "any",
    categories: ["utilities", "productivity", "networking"],
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Open OmniDrop P2P",
        short_name: "P2P Drop",
        description: "Direct in-browser file transfer between devices",
        url: "/app",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/og-banner.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "OmniDrop Wire-Speed P2P Transfer",
      },
    ],
  };
}
