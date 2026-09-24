import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MarkerThing",
  description:
    "MarkerThing By Ping.gg - Export Twitch Markers as .csv with ease",
  icons: "/favicon.svg",
};

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
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
        afterSignOutUrl="/"
        appearance={{
          // Clerk's dark theme, inlined. @clerk/ui/themes would pull in
          // Solana and React Native just for these colors.
          variables: {
            colorBackground: "#212126",
            colorNeutral: "white",
            colorPrimary: "#ffffff",
            colorPrimaryForeground: "black",
            colorForeground: "white",
            colorInputForeground: "white",
            colorInput: "#26262B",
          },
        }}
      >
        <body
          className="overscroll-none bg-landing"
          style={{ backgroundImage: `url(/background.svg)` }}
        >
          <div className="flex h-screen w-full grow flex-col">{children}</div>
        </body>
      </ClerkProvider>
    </html>
  );
}
