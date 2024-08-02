import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://markerthing.com",
      lastModified: new Date(),
    },
  ];
}
