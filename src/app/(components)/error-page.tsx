"use client";

import { ButtonLink } from "./common/button";

export const ErrorPage = () => {
  return (
    <div className="flex grow flex-col items-center justify-center gap-4 text-2xl font-bold">
      An error has occurred
      <ButtonLink href="/" size="2xl">
        Go Home
      </ButtonLink>
    </div>
  );
};
