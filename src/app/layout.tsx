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
import Link from "next/link";
import Icon from "./(components)/icon";

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
            <div className="flex w-full items-center justify-between border-b border-white px-4">
              <Link
                href="/"
                className="flex items-center gap-2 py-4 text-2xl font-bold"
              >
                <Icon size={32} />
                MarkerThing
              </Link>

              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  layout: {
                    logoPlacement: "none",
                  },
                  elements: {
                    userButtonAvatarBox: "h-12 w-12",
                  },
                }}
              />
            </div>
            {children}
          </div>
        </body>
      </ClerkProvider>
    </html>
  );
}
