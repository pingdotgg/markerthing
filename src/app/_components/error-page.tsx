"use client";

import { ButtonLink } from "./common/button";

export const ErrorPage = (props: { message?: string }) => {
  return (
    <div className="flex grow flex-col items-center justify-center gap-4 text-2xl font-bold">
      <div className="p-8 text-center">
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          {`An error occurred`}
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">
          {props.message ??
            `Sorry, we couldn’t find the page you’re looking for.`}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <ButtonLink href="/" variant="primary">
            {`Go back home`}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
};
