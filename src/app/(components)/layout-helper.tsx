import React, { Suspense } from "react";
import {
  SignedIn,
  SignedOut,
  UserButton,
  currentUser,
} from "@clerk/nextjs/app-beta";

import { LogoMark } from "./logomark";
import { SignInButton } from "./signin";
import { GoToVodsButton } from "./gotovods";

const AsyncVodsButton = async ({ slug }: { slug: string | undefined }) => {
  const user = await currentUser();

  if (user?.username === slug) return null;

  return <GoToVodsButton user={user?.username} />;
};

const TopRightNav = async ({ slug }: { slug: string | undefined }) => {
  return (
    <>
      <Suspense fallback={<div />}>
        {/** @ts-expect-error Async Server Component */}
        <AsyncVodsButton slug={slug} />
      </Suspense>
      <div className="flex h-12 w-12 items-center">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            layout: {
              logoPlacement: "none",
            },
            elements: {
              userButtonAvatarBox: "h-8 w-8 sm:h-12 sm:w-12",
            },
          }}
        />
      </div>
    </>
  );
};

export const LayoutHelper = async ({
  children,
  slug,
}: {
  children: React.ReactNode;
  slug?: string;
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex h-16 w-full items-center justify-between px-4 py-4 sm:px-8">
        <LogoMark />

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            {/* TODO: Make this fallback a skeleton with a profile picture since we know that much by now */}
            <Suspense fallback={<div />}>
              {/* @ts-expect-error Server Component */}
              <TopRightNav slug={slug} />
            </Suspense>
          </SignedIn>
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Footer */}
      <div className="flex justify-between px-4 py-4 sm:px-8">
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
    </>
  );
};
