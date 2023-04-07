import { auth } from "@clerk/nextjs/app-beta";
import {
  getTwitchTokenFromClerk,
  getVodWithMarkers,
} from "~/utils/twitch-server";
import { VodPlayer } from "./player";
import Script from "next/script";

export const dynamic = "force-dynamic";

// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 60;

export default async function VodPage({
  params,
}: {
  params: { slug: string };
}) {
  const self = await auth();
  if (!self || !self.userId) return <div>You have to be signed in</div>;

  const token = await getTwitchTokenFromClerk(self.userId);

  const vodDetails = await getVodWithMarkers(params.slug, token);

  return (
    <>
      <Script src="https://player.twitch.tv/js/embed/v1.js" async />
      <VodPlayer id={params.slug} vod={vodDetails} />
    </>
  );
}
