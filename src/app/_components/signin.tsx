"use client";

import { useClerk } from "@clerk/nextjs";

import Button from "./common/button";

export const SignInButton = () => {
  const { openSignIn } = useClerk();

  return (
    <Button
      className="h-8"
      onClick={() =>
        openSignIn({
          appearance: {
            variables: {
              colorPrimary: "#E24A8D",
            },
          },
        })
      }
    >
      Sign In
    </Button>
  );
};
