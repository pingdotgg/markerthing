import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MarkerThing",
  description:
    "MarkerThing By Ping.gg - Export Twitch Markers as .csv with ease",
  icons: "/favicon.svg",
};

export const runtime = "experimental-edge";

import React from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  currentUser,
} from "@clerk/nextjs/app-beta";
import { dark } from "@clerk/themes";
import PlausibleProvider from "next-plausible";

import { LogoMark } from "./(components)/logomark";
import { ButtonLink } from "./(components)/common/button";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
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
          className="bg-landing"
          style={{ backgroundImage: `url(/background.svg)` }}
        >
          <div className="flex h-screen w-full grow flex-col">
            <div className="flex h-16 w-full items-center justify-between px-8 pt-4">
              <LogoMark />

              <div className="flex gap-2">
                <SignedOut>
                  <ButtonLink href="/sign-in">Sign In</ButtonLink>
                </SignedOut>
                <SignedIn>
                  <ButtonLink href={`/${user?.username}`}>
                    Go to your VODs
                  </ButtonLink>
                  <div className="h-12 w-12">
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
                </SignedIn>
              </div>
            </div>
            {children}
            <div className="flex justify-between px-8 py-4">
              <span>
                Made with &hearts; by{" "}
                <a
                  href="https://ping.gg"
                  className="font-bold text-pink-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ping.gg
                </a>
              </span>
              <div className="flex gap-4">
                <a
                  href="https://github.com/pingdotgg/markerthing/issues"
                  className="font-bold text-pink-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Feedback
                </a>
                <a
                  href="https://github.com/pingdotgg/markerthing"
                  className="font-bold text-pink-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Github
                </a>
                <a
                  href="https://ping.gg/discord"
                  className="font-bold text-pink-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </body>
      </ClerkProvider>
    </html>
  );
}
