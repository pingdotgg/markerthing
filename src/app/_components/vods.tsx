import {
  generateTwitchRequestHeaders,
  getTwitchUserId,
} from "~/utils/twitch-server";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { ButtonLink } from "./common/button";

const getTwitchClientCredentials = async () => {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
      redirect: "follow",
    }
  ).then((response) => response.json());

  return response.access_token as string;
};

function sendTwitchAPIRequest(path: string, title: string, creds: string) {
  return fetch(`https://api.twitch.tv${path}`, {
    method: "GET",
    headers: generateTwitchRequestHeaders(creds),
    redirect: "follow",
    next: { revalidate: 60 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then((json) => {
        throw new Error(
          `${title} Request Failed: ${json.status}: ${json.error}${
            json.message ? ` -- ${json.message}` : ""
          }`
        );
      });
    }
  });
}

interface Pagination {
  cursor?: string;
}

interface TwitchVodRequest {
  data: VodResponse[];
  pagination: Pagination;
}

interface VodResponse {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  stream_id: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
  created_at: string;
}

interface TwitchStreamRequest {
  data: StreamResponse[];
  pagination: Pagination;
}

interface StreamResponse {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  tags: string[];
  viewer_count: number;
  startedAt: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

const VodEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-2 text-gray-500">
      <h3 className="text-lg font-medium text-gray-400">
        {"It's awfully quiet here..."}
      </h3>
      <p className="text-sm ">No VODs found for this channel.</p>
      <ButtonLink href="/theo">{`Check out Theo's VODs`}</ButtonLink>
    </div>
  );
};

export const VODs = async (props: { username: string; after?: string }) => {
  const self = await auth();
  if (!self) throw new Error("you shouldn't be here");

  const creds = await getTwitchClientCredentials();
  const twitchUserId = await getTwitchUserId(props.username, creds);
  if (!twitchUserId) return <VodEmptyState />;

  // Twitch keeps past broadcasts for 60 days at most, so the max page size of
  // 100 fits almost every channel on one page. The page links cover the rest.
  const videoParams = new URLSearchParams({
    user_id: twitchUserId,
    type: "archive",
    first: "100",
  });
  if (props.after) videoParams.set("after", props.after);

  // fetch vods from twitch api

  const [vodResult, streamResult]: [
    PromiseSettledResult<TwitchVodRequest>,
    PromiseSettledResult<TwitchStreamRequest>
  ] = await Promise.allSettled([
    sendTwitchAPIRequest(`/helix/videos?${videoParams}`, "Videos", creds),
    sendTwitchAPIRequest(
      `/helix/streams?user_id=${twitchUserId}&type=live`,
      "Streams",
      creds
    ),
  ]);

  if (vodResult.status === "rejected") {
    throw new Error(vodResult.reason.message);
  }

  // A failed live check only means the live VOD is not filtered out, so log
  // it and still show the list.
  if (streamResult.status === "rejected") {
    console.error("Live stream check failed:", streamResult.reason);
  }

  const vodData = vodResult.value.data;
  const streamData =
    streamResult.status === "fulfilled" ? streamResult.value.data : [];

  const streamMap = new Map<string, boolean>(
    streamData.map((stream) => [stream.id, true])
  );
  const filteredVodData = vodData.filter(
    ({ stream_id }) => !streamMap.has(stream_id)
  );
  // Twitch can return an empty page near the end of the list. Treat an empty
  // page as the end, and do not link past it.
  const nextCursor =
    filteredVodData.length > 0 ? vodResult.value.pagination?.cursor : undefined;
  const channelPath = `/${encodeURIComponent(props.username)}`;
  const olderVodsPath = nextCursor
    ? `${channelPath}?${new URLSearchParams({ after: nextCursor })}`
    : null;

  return (
    <div className="my-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 overflow-y-auto p-4">
      {filteredVodData.length === 0 ? (
        props.after ? (
          <p className="text-sm text-gray-500">No older VODs.</p>
        ) : (
          <VodEmptyState />
        )
      ) : (
        filteredVodData.map((vod) => (
          <Link key={vod.id} href={`/v/${vod.id}`}>
            <div
              key={vod.id}
              className="group relative flex w-96 flex-col overflow-hidden rounded-lg border border-gray-950 bg-black shadow-md"
            >
              <Image
                src={vod.thumbnail_url
                  .replace("%{width}", "1280")
                  .replace("%{height}", "720")}
                width={1280}
                height={720}
                alt={"thumbnail"}
                className="w-96 group-hover:opacity-50"
              />
              <div className="absolute left-0 top-0 p-2">
                <div className="rounded-lg bg-gray-900/70 px-2 py-1 font-semibold text-white">
                  {new Date(vod.created_at).toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="absolute bottom-0 w-full bg-gray-900/80 px-3 py-2 text-lg font-semibold">
                <span className="line-clamp-1">{vod.title}</span>
              </div>
            </div>
          </Link>
        ))
      )}
      {(olderVodsPath || props.after) && (
        <nav
          className="flex w-full justify-center gap-3"
          aria-label="VOD pages"
        >
          {props.after && (
            <ButtonLink href={channelPath}>Latest VODs</ButtonLink>
          )}
          {olderVodsPath && (
            <ButtonLink href={olderVodsPath}>Older VODs</ButtonLink>
          )}
        </nav>
      )}
    </div>
  );
};
