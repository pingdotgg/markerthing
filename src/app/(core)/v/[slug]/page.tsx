import { auth } from "@clerk/nextjs/server";
import {
  getTwitchTokenFromClerk,
  getVodWithMarkers,
  TwitchMarkerAccessDeniedError,
} from "~/utils/twitch-server";
import { VodPlayer } from "./player";
import Script from "next/script";

export const dynamic = "force-dynamic";

export default async function VodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const self = await auth();
  if (!self || !self.userId) return <div>You have to be signed in</div>;

  const token = await getTwitchTokenFromClerk(self.userId);

  let vodDetails;
  try {
    vodDetails = await getVodWithMarkers(slug, token);
  } catch (error) {
    if (!(error instanceof TwitchMarkerAccessDeniedError)) throw error;
    return (
      <div className="my-auto px-4 text-center">
        <h1 className="text-2xl font-semibold">Markers are private</h1>
        <p className="mt-2 text-gray-300">
          Sign in with the Twitch account that owns this VOD or has editor
          access.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://player.twitch.tv/js/embed/v1.js" async />
      <VodPlayer id={slug} vod={vodDetails} />
    </>
  );
}
