import { getEmbedKey } from "~/utils/embed-key";
import { getLiveTopic } from "~/utils/twitch-server";
import { LiveTopicView } from "./live-topic";

export const dynamic = "force-dynamic";

// OBS browser dock / source. Shows the current topic and how long it has run.
export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { key?: string };
}) {
  if (searchParams.key !== (await getEmbedKey(params.username))) {
    return <LiveTopicView status="Invalid embed link" />;
  }

  // Never throw here. An error page would stop the refresh loop in OBS.
  try {
    const topic = await getLiveTopic(params.username);
    if (!topic) return <LiveTopicView status="Offline" />;
    return <LiveTopicView topic={topic} />;
  } catch (e) {
    console.error("EMBED ERROR", e);
    return <LiveTopicView status="Could not load markers" />;
  }
}
