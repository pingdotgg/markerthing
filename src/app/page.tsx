import { currentUser, clerkClient } from "@clerk/nextjs/app-beta";
import { Suspense } from "react";
import { LoadingPage } from "~/components/loading";
import { CustomSignIn } from "./sign-in";
import { User } from "@clerk/nextjs/dist/api";
import {
  generateTwitchRequestHeaders,
  getTwitchUserId,
} from "~/utils/twitch-server";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

export interface Pagination {
  cursor: string;
}

export interface TwitchVodRequest {
  data: VodResponse[];
  pagination: Pagination;
}

export interface VodResponse {
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

const VODs = async (props: { self: User }) => {
  const [{ token }] = await clerkClient.users.getUserOauthAccessToken(
    props.self.id,
    "oauth_twitch"
  );

  const twitchUserId = await getTwitchUserId(props.self.username!, token);

  // fetch vods from twitch api
  const response = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${twitchUserId}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      redirect: "follow",
    }
  ).then((response) => response.json());

  console.log("res", response);

  const data = (response as TwitchVodRequest).data;

  return (
    <div className="flex flex-wrap gap-4 p-4 items-center justify-center h-full w-full">
      {data.map((vod) => (
        <Link key={vod.id} href={`/v/${vod.id}`}>
          <div
            key={vod.id}
            className="flex flex-col w-96 h-80 bg-slate-400 rounded-xl overflow-hidden relative"
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
            <div className="absolute top-0 left-0 p-2">
              <div className="font-bold bg-slate-900/70 text-white p-2 rounded-xl">
                {dayjs(vod.created_at).format("MM/DD/YYYY")}
              </div>
            </div>
            <div className="text-xl font-bold p-4">{vod.title}</div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default async function Home() {
  const self = await currentUser();
  return (
    <div className="flex h-screen w-full grow flex-col justify-center items-center">
      {!self && <CustomSignIn />}
      {self && (
        <Suspense fallback={<LoadingPage />}>
          {/* @ts-expect-error Server Component */}
          <VODs self={self} />
        </Suspense>
      )}
    </div>
  );
}
