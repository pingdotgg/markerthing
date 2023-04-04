"use client";

import { ButtonLink } from "./common/button";

export const GoToVodsButton: React.FC<{ user?: string | null }> = ({
  user,
}) => {
  if (!user || user === window?.location.pathname.slice(1)) {
    return null;
  }

  return (
    <ButtonLink className="h-8" href={`/${user}`}>
      <span className="hidden sm:inline">Go to your</span>
      {` VODs `}
      <span className="hidden sm:inline">&rarr;</span>
    </ButtonLink>
  );
};
