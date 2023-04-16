import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://marker.ping.gg",
      lastModified: new Date(),
    },
  ];
}
