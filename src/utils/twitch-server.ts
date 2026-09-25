import { clerkClient } from "@clerk/nextjs/server";
import { parseMarkerLabel, parseRewind } from "./markers";

export const generateTwitchRequestHeaders = (accessToken: string) => {
  const headers = new Headers();
  headers.append("Client-ID", process.env.TWITCH_CLIENT_ID!);
  headers.append("Accept", "application/vnd.twitchtv.v5+json");
  headers.append("Authorization", `Bearer ${accessToken}`);

  return headers;
};

export const getTwitchUserId = async (userName: string, token: string) => {
  const response = await fetch(
    `https://api.twitch.tv/helix/users?${new URLSearchParams({
      login: userName,
    })}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      // Twitch logins can change or be reassigned to another account.
      next: { revalidate: 60 },
    }
  );
  if (!response.ok) {
    throw new Error(`Could not look up Twitch user: ${response.status}`);
  }

  const result = (await response.json()) as { data?: { id: string }[] };
  return result.data?.[0]?.id ?? null;
};

export type VOD = {
  created_at: string;
  markers: {
    id: string;
    created_at: string;
    description: string;
    position_seconds: number;
    URL: string;
  }[];
  duration: string;
};

// Used for VOD markers and the live topic embed
const getValidTokenForCreator = async (creatorName: string) => {
  // Get token for the input displayName IF THEY HAVE SIGNED IN BEFORE
  const clerk = await clerkClient();
  const response = await clerk.users.getUserList({
    username: [creatorName],
  });

  const creatorFoundInClerk = response.data[0];

  // Early escape if we don't find this user in Clerk
  if (!creatorFoundInClerk) {
    throw new Error("User not found in Clerk");
  }

  return await getTwitchTokenFromClerk(creatorFoundInClerk.id);
};

// Loads a VOD and its markers. Markers are read with the creator's stored
// token, so any signed-in user can view a connected creator's markers.
// Throws on Twitch errors, so a failed request is not read as "no markers".
export const getVodWithMarkers = async (vodId: string, token: string) => {
  const vodResponse = await fetch(
    `https://api.twitch.tv/helix/videos?id=${vodId}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      redirect: "follow",
      cache: "no-store",
    }
  );
  if (!vodResponse.ok) {
    throw new Error(`Twitch videos request failed: ${vodResponse.status}`);
  }

  const vodData = (await vodResponse.json()) as {
    data?: (Omit<VOD, "markers"> & { user_login: string })[];
  };
  const vod = vodData.data?.[0];

  if (!vod) throw new Error("could not find vod data or user login");

  const tokenForMarkers = await getValidTokenForCreator(vod.user_login);

  const markersResponse = await fetch(
    `https://api.twitch.tv/helix/streams/markers?video_id=${vodId}&first=100`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(tokenForMarkers),
      next: { revalidate: 60 },
    }
  );
  if (!markersResponse.ok) {
    throw new Error(`Twitch markers request failed: ${markersResponse.status}`);
  }

  const markersData = (await markersResponse.json()) as TwitchMarkersResponse;
  const markers = markersData.data?.[0]?.videos?.[0]?.markers ?? [];

  return { ...vod, markers };
};

export const getTwitchTokenFromClerk = async (clerkUserId: string) => {
  if (!clerkUserId) throw new Error("unauthorized");
  const clerk = await clerkClient();
  const response = await clerk.users.getUserOauthAccessToken(
    clerkUserId,
    "twitch"
  );
  const token = response.data[0].token;

  return token;
};

export type LiveTopic = {
  label: string;
  type: "start" | "end";
  // Unix ms. Includes any "-2" style rewind on the marker.
  startedAt: number;
};

type TwitchMarkersResponse = {
  data?: { videos?: { markers?: VOD["markers"] }[] }[];
  pagination?: { cursor?: string };
};

// Uncached Twitch GET. Returns null on 404 (markers 404 when a creator has
// no VODs). Throws on other errors, so a failed request is not read as
// "offline" or "no markers".
const fetchTwitchLive = async <T>(path: string, token: string) => {
  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    headers: generateTwitchRequestHeaders(token),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Twitch ${path} failed: ${res.status}`);
  return (await res.json()) as T;
};

// Gets the current topic for a live creator, from the latest marker on the
// live stream. Returns null when the creator is not live.
export const getLiveTopic = async (
  creatorName: string
): Promise<LiveTopic | null> => {
  const token = await getValidTokenForCreator(creatorName);
  const userId = await getTwitchUserId(creatorName, token);
  if (!userId) return null;

  const streamRes = await fetchTwitchLive<{ data: { started_at: string }[] }>(
    `/streams?user_id=${userId}`,
    token
  );
  const stream = streamRes?.data[0];
  if (!stream) return null;

  // Markers come oldest first, max 100 per page, so walk to the last page.
  // The page cap is only a guard against a bad cursor loop.
  const markers: VOD["markers"] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await fetchTwitchLive<TwitchMarkersResponse>(
      `/streams/markers?user_id=${userId}&first=100${
        cursor ? `&after=${cursor}` : ""
      }`,
      token
    );

    markers.push(
      ...(res?.data?.[0]?.videos?.flatMap((video) => video.markers ?? []) ?? [])
    );
    cursor = res?.pagination?.cursor;
    if (!cursor) break;
  }

  const streamStart = Date.parse(stream.started_at);

  // The current topic is the last marker placed on this stream. Offset
  // markers are not topics. Markers from before the stream started are from
  // an older VOD, in case Twitch has not made one for this stream yet.
  const topics = markers
    .filter((marker) => Date.parse(marker.created_at) >= streamStart)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((marker) => {
      const { rewindSeconds, description } = parseRewind(marker.description);
      return {
        ...parseMarkerLabel(description),
        // A "-2" rewind only moves the timer start, not which topic is current
        startedAt: Math.max(
          Date.parse(marker.created_at) - rewindSeconds * 1000,
          streamStart
        ),
      };
    })
    .filter((topic): topic is LiveTopic => topic.type !== "offset");

  // Same "Intro" fallback as the VOD page
  return (
    topics[topics.length - 1] ?? {
      label: "Intro",
      type: "start",
      startedAt: streamStart,
    }
  );
};
