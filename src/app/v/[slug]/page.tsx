import { currentUser } from "@clerk/nextjs/app-beta";
import {
  getTwitchTokenFromClerk,
  getVodWithMarkers,
} from "~/utils/twitch-server";
import { VodPlayer } from "./player";
import Script from "next/script";

export const dynamic = "force-dynamic";

// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 0;

export default async function VodPage({
  params,
}: {
  params: { slug: string };
}) {
  const self = await currentUser();
  if (!self) return <div>You have to be signed in</div>;

  const token = await getTwitchTokenFromClerk(self.id);

  const vodDetails = await getVodWithMarkers(params.slug, token);

  return (
    <div>
      <Script src="https://player.twitch.tv/js/embed/v1.js" async />
      <VodPlayer id={params.slug} vod={vodDetails} />
    </div>
  );
}
