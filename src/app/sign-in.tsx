"use client";

import { useClerk } from "@clerk/nextjs/app-beta/client";

export const CustomSignIn = () => {
  const { openSignIn } = useClerk();

  return (
      <button
        onClick={() => openSignIn()}
        className="text-2xl font-bold hover:text-slate-400 hover:underline"
      >
        Sign In
      </button>
  );
};
