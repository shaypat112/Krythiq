import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Krythiq",
    short_name: "Krythiq",
    description: "Repository security scans, findings, and remediation workflows.",
    start_url: "/",
    display: "standalone",
    background_color: "#11151a",
    theme_color: "#11151a",
    icons: [
      {
        src: "/krythiq-favicon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
