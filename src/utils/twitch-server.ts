import { clerkClient } from "@clerk/nextjs/server";
import { getLiveTopicFromMarkers, type LiveTopic } from "./markers";

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

  return getLiveTopicFromMarkers({
    markers,
    streamStart: Date.parse(stream.started_at),
  });
};

export class PublicStreamError extends Error {
  constructor(
    public readonly code: "channel_live" | "no_archive",
    public readonly status: 409 | 404,
    message: string
  ) {
    super(message);
  }
}

type PublicArchive = {
  id: string;
  user_id: string;
  user_login: string;
  type: string;
  title: string;
  created_at: string;
  duration: string;
};

// Theo has opted into public markers. Keep this fixed to his channel: stored
// creator tokens do not imply consent to publish other creators' markers.
export const getLatestPublicTheoStream = async () => {
  const channel = "theo";
  const token = await getValidTokenForCreator(channel);
  const userId = await getTwitchUserId(channel, token);
  if (!userId) {
    throw new PublicStreamError("no_archive", 404, "No archived stream found.");
  }
  const request = async <T extends { data: unknown[] }>(path: string) => {
    const response = await fetch(`https://api.twitch.tv/helix${path}`, {
      headers: generateTwitchRequestHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`Twitch workflow request failed: ${response.status}`);
    const value = (await response.json()) as T;
    if (!value || !Array.isArray(value.data)) {
      throw new Error("Twitch workflow response has no data array");
    }
    return value;
  };
  const requireOffline = async () => {
    const live = await request<{ data: { id: string }[] }>(
      `/streams?${new URLSearchParams({ user_id: userId })}`
    );
    if (live.data.length) {
      throw new PublicStreamError(
        "channel_live",
        409,
        "The channel is still live."
      );
    }
  };
  await requireOffline();
  const archives = await request<{ data: PublicArchive[] }>(
    `/videos?${new URLSearchParams({
      user_id: userId,
      type: "archive",
      sort: "time",
      first: "1",
    })}`
  );
  const vod = archives.data[0];
  if (!vod)
    throw new PublicStreamError("no_archive", 404, "No archived stream found.");
  if (
    vod.user_id !== userId ||
    vod.user_login !== channel ||
    vod.type !== "archive" ||
    !/^\d+$/.test(vod.id)
  ) {
    throw new Error("Twitch returned an unexpected archive");
  }

  type Marker = Pick<
    VOD["markers"][number],
    "id" | "created_at" | "description" | "position_seconds"
  >;
  type MarkerPage = {
    data: {
      user_id: string;
      videos: { video_id: string; markers: Marker[] }[];
    }[];
    pagination?: { cursor?: string };
  };
  const markers: Marker[] = [];
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ video_id: vod.id, first: "100" });
    if (cursor) params.set("after", cursor);
    const result = await request<MarkerPage>(`/streams/markers?${params}`);
    for (const creator of result.data) {
      if (creator.user_id !== userId || !Array.isArray(creator.videos))
        throw new Error("Unexpected marker owner");
      for (const video of creator.videos) {
        if (video.video_id !== vod.id || !Array.isArray(video.markers))
          throw new Error("Unexpected marker video");
        for (const marker of video.markers) {
          if (
            !marker ||
            typeof marker.id !== "string" ||
            seenIds.has(marker.id) ||
            typeof marker.description !== "string" ||
            typeof marker.created_at !== "string" ||
            !Number.isFinite(marker.position_seconds) ||
            marker.position_seconds < 0
          ) {
            throw new Error("Invalid or repeated stream marker");
          }
          seenIds.add(marker.id);
          // Select fields explicitly; upstream credentials and future private
          // Twitch response fields must never leak through this public API.
          markers.push({
            id: marker.id,
            created_at: marker.created_at,
            description: marker.description,
            position_seconds: marker.position_seconds,
          });
        }
      }
    }
    cursor = result.pagination?.cursor;
    if (!cursor) break;
    if (seenCursors.has(cursor) || page === 9)
      throw new Error("Marker pagination is incomplete");
    seenCursors.add(cursor);
  }
  // A stream could start while several pages of markers were being fetched.
  await requireOffline();
  return {
    schema_version: 1,
    channel,
    offline: true,
    markers_complete: true,
    fetched_at: new Date().toISOString(),
    id: vod.id,
    user_login: vod.user_login,
    type: vod.type,
    title: vod.title,
    created_at: vod.created_at,
    duration: vod.duration,
    markers,
  };
};
