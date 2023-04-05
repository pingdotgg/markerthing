import {
  generateTwitchRequestHeaders,
  getTwitchUserId,
} from "~/utils/twitch-server";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import { auth } from "@clerk/nextjs/app-beta";

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
  }).then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then((json) => {
        throw new Error(`${title} Request Failed: ${json.status}: ${json.error}${json.message ? ` -- ${json.message}` : ''}`);
      })
    }
  });
}

interface Pagination {
  cursor: string;
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
    <div className="flex flex-col items-center justify-center p-2 text-gray-500">
      <h3 className="mt-6 text-lg font-medium text-gray-400">
        {"It's awfully quiet here..."}
      </h3>
      <p className="mt-1 text-sm ">No VODs found for this channel.</p>
    </div>
  );
};

export const VODs = async (props: { username: string }) => {
  const self = await auth();
  if (!self) throw new Error("you shouldn't be here");

  const creds = await getTwitchClientCredentials();
  const twitchUserId = await getTwitchUserId(props.username, creds);

  // fetch vods from twitch api

  const [
    { data: vodData }, 
    { data: streamData }
  ]: [TwitchVodRequest, TwitchStreamRequest] = await Promise.all([
    sendTwitchAPIRequest(`/helix/videos?user_id=${twitchUserId}`, "Videos", creds),
    sendTwitchAPIRequest(`/helix/streams?user_id=${twitchUserId}&type=live`, "Streams", creds),
  ]);

  const streamMap = new Map<string, boolean>(streamData.map((stream) => [stream.id, true]));
  const filteredVodData = vodData.filter(({ stream_id }) => !streamMap.has(stream_id));

  return (
    <div className="flex flex-1 flex-wrap items-center justify-center gap-4 overflow-y-auto p-4">
      {filteredVodData.length === 0 ? (
        <VodEmptyState />
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
                  {dayjs(vod.created_at).format("MM/DD/YYYY")}
                </div>
              </div>
              <div className="absolute bottom-0 w-full bg-gray-900/80 px-3 py-2 text-lg font-semibold">
                <span className="line-clamp-1">{vod.title}</span>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
};
