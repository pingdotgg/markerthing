import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { ButtonLink } from "~/app/_components/common/button";
import { SignInButton } from "~/app/_components/signin";
import { EXPORT_BUFFER_SECONDS, MAX_BUFFER_SECONDS } from "~/utils/markers";
import { getVodWithMarkers } from "~/utils/twitch-server";
import { VodPlayer } from "./player";

export const metadata: Metadata = { title: "VOD markers | MarkerThing" };

const Notice = (props: { title: string; children: React.ReactNode }) => (
  <div className="m-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
    <h1 className="text-xl font-semibold">{props.title}</h1>
    {props.children}
  </div>
);

export default async function VodPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    offset?: string;
    buffer?: string;
    numbered?: string;
  }>;
}) {
  const [{ slug }, query, self] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);

  if (!self.userId) {
    return (
      <Notice title="Sign in to see markers">
        <SignInButton />
      </Notice>
    );
  }

  const result = await getVodWithMarkers(slug, self.userId);

  if (result.status === "not-found") {
    return (
      <Notice title="VOD not found">
        <p>This VOD does not exist, or Twitch deleted it.</p>
        <ButtonLink href="/">Go home</ButtonLink>
      </Notice>
    );
  }

  if (result.status === "creator-not-connected") {
    return (
      <Notice title="Markers not available">
        <p>
          {result.rejected
            ? `${result.creator} needs to sign in to MarkerThing again.`
            : `${result.creator} has not signed in to MarkerThing yet.`}
        </p>
        <ButtonLink href="/">Go home</ButtonLink>
      </Notice>
    );
  }

  const buffer = Number(query.buffer);

  return (
    <VodPlayer
      vod={result.vod}
      initial={{
        offset: query.offset ?? "",
        buffer:
          Number.isInteger(buffer) &&
          buffer >= 0 &&
          buffer <= MAX_BUFFER_SECONDS
            ? buffer
            : EXPORT_BUFFER_SECONDS,
        numbered: query.numbered === "1",
      }}
    />
  );
}
