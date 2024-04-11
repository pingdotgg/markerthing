import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
export const runtime = "edge";

export const metadata = {
  title: "MarkerThing",
  description:
    "MarkerThing By Ping.gg - Export Twitch Markers as .csv with ease",
  icons: "/favicon.svg",
};

import React from "react";
import { ClerkProvider } from "@clerk/nextjs/app-beta";
import { dark } from "@clerk/themes";
import PlausibleProvider from "next-plausible";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="marker.ping.gg" />
      </head>
      <ClerkProvider
        appearance={{
          baseTheme: dark,
        }}
      >
        <body
          className="overscroll-none bg-landing"
          style={{ backgroundImage: `url(/background.svg)` }}
        >
          <div className="flex h-screen w-full grow flex-col">{JSON.stringify(process)}{children}</div>
        </body>
      </ClerkProvider>
    </html>
  );
}
