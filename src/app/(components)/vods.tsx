import type { User } from "@clerk/nextjs/dist/api";
import {
  generateTwitchRequestHeaders,
  getTwitchUserId,
} from "~/utils/twitch-server";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import { clerkClient } from "@clerk/nextjs/app-beta";

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

export const VODs = async (props: { self: User; username: string }) => {
  const creds = await getTwitchClientCredentials();
  const twitchUserId = await getTwitchUserId(props.username, creds);

  // fetch vods from twitch api
  const response = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${twitchUserId}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(creds),
      redirect: "follow",
    }
  ).then((response) => response.json());

  const data = (response as TwitchVodRequest).data;

  return (
    <div className="flex h-full w-full flex-wrap items-center justify-center gap-4 p-4">
      {data.length === 0 && <div className="text-2xl font-bold">No VODs</div>}
      {data.map((vod) => (
        <Link key={vod.id} href={`/v/${vod.id}`}>
          <div
            key={vod.id}
            className="relative flex w-96 flex-col overflow-hidden rounded-xl hover:opacity-80"
          >
            <Image
              src={vod.thumbnail_url
                .replace("%{width}", "1280")
                .replace("%{height}", "720")}
              width={1280}
              height={720}
              alt={"thumbnail"}
              className="w-96"
            />
            <div className="absolute left-0 top-0 p-2">
              <div className="rounded-xl bg-slate-900/70 p-2 font-semibold text-white">
                {dayjs(vod.created_at).format("MM/DD/YYYY")}
              </div>
            </div>
            <div className="absolute bottom-0 w-full bg-slate-900/80 p-2 text-lg font-semibold">
              <span className="line-clamp-1">{vod.title}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
