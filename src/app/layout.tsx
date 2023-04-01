import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Marker Tool",
  description: "By Ping.gg",
  icons: "/favicon.svg",
};

import React from "react";
import { ClerkProvider, UserButton } from "@clerk/nextjs/app-beta";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body>
          <div className="flex h-screen w-full grow flex-col">
            <div className="flex w-full justify-between border-b border-white p-4">
              <span className="text-xl font-bold">MarkerThing</span>
              <UserButton afterSignOutUrl="/" />
            </div>
            {children}
          </div>
        </body>
      </ClerkProvider>
    </html>
  );
}
