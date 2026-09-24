import { getEmbedKey } from "~/utils/embed-key";
import { getLiveTopic } from "~/utils/twitch-server";
import { LiveTopicView } from "./live-topic";

export const dynamic = "force-dynamic";

// OBS browser dock / source. Shows the current topic and how long it has run.
export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ username }, { key }] = await Promise.all([params, searchParams]);
  if (key !== (await getEmbedKey(username))) {
    return <LiveTopicView status="Invalid embed link" />;
  }

  // Never throw here. An error page would stop the refresh loop in OBS.
  const topic = await getLiveTopic(username).catch((e) => {
    console.error("EMBED ERROR", e);
    return "error" as const;
  });
  if (topic === "error") {
    return <LiveTopicView status="Could not load markers" />;
  }
  if (!topic) return <LiveTopicView status="Offline" />;
  return <LiveTopicView topic={topic} />;
}
