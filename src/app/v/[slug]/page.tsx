import { clerkClient, currentUser } from "@clerk/nextjs/app-beta";
import { getVodWithMarkers } from "~/utils/twitch-server";
import { VodPlayer } from "./player";
import Script from "next/script";

export const dynamic = "force-dynamic";

export default async function VodPage({
  params,
}: {
  params: { slug: string };
}) {
  const self = await currentUser();

  if (!self) return <div>You have to be signed in</div>;

  const [{ token }] = await clerkClient.users.getUserOauthAccessToken(
    self.id,
    "oauth_twitch"
  );

  const vodDetails = await getVodWithMarkers(params.slug, token);

  return (
    <div>
      <Script src="https://player.twitch.tv/js/embed/v1.js" async />
      <VodPlayer id={params.slug} vod={vodDetails} />
    </div>
  );
}
