import { clerkClient } from "@clerk/nextjs/server";
import { parseMetadataFromMarker, parseRewind } from "./markers";

export const generateTwitchRequestHeaders = (accessToken: string) => {
  const headers = new Headers();
  headers.append("Client-ID", process.env.TWITCH_CLIENT_ID!);
  headers.append("Accept", "application/vnd.twitchtv.v5+json");
  headers.append("Authorization", `Bearer ${accessToken}`);

  return headers;
};

export const getTwitchUserId = async (userName: string, token: string) => {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${userName}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      next: { revalidate: Infinity }, // These should never change
    }
  ).then((response) => response.json());
  if (res.error === "Unauthorized") throw new Error("Unauthorized");

  const responseId = (res as any)?.data[0]?.id as string;
  if (!responseId) return null;

  return responseId;
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

// Used for vod markers
const getValidTokenForCreator = async (creatorName: string) => {
  // Get token for the input displayName IF THEY HAVE SIGNED IN BEFORE
  const response = await clerkClient.users.getUserList({
    username: [creatorName],
  });

  const creatorFoundInClerk = response.data[0];

  console.log("found in clerk?", creatorFoundInClerk);

  // Early escape if we don't find this user in Clerk
  if (!creatorFoundInClerk) {
    throw new Error("User not found in Clerk");
  }

  return await getTwitchTokenFromClerk(creatorFoundInClerk.id);
};

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
  console.log("VOD RESPONSE", vodResponse.status);

  const vodData = await vodResponse.json();
  console.log("VOD DATA", vodData);

  const creatorName = vodData?.data?.[0]?.user_login;

  if (!creatorName) throw new Error("could not find vod data or user login");

  const tokenForMarkers = await getValidTokenForCreator(creatorName);

  const markersResponse = await fetch(
    `https://api.twitch.tv/helix/streams/markers?video_id=${vodId}&first=100`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(tokenForMarkers),
      next: { revalidate: 60 },
    }
  );

  console.log("MARKER RESPONSE", markersResponse.status);

  const markersData = await markersResponse.json();
  console.log("MARKER DATA", markersData);

  const markers = markersData?.data?.[0]?.videos?.[0]["markers"] ?? [];

  return { ...vodData?.data?.[0], markers } as VOD;
};

export const getTwitchTokenFromClerk = async (clerkUserId: string) => {
  if (!clerkUserId) throw new Error("unauthorized");
  const response = await clerkClient.users.getUserOauthAccessToken(
    clerkUserId,
    "oauth_twitch"
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

// Gets the current topic for a live creator, from the latest marker on the
// live stream. Returns null when the creator is not live.
export const getLiveTopic = async (
  creatorName: string
): Promise<LiveTopic | null> => {
  const token = await getValidTokenForCreator(creatorName);
  const userId = await getTwitchUserId(creatorName, token);
  if (!userId) return null;

  const streamRes = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${userId}`,
    { headers: generateTwitchRequestHeaders(token), cache: "no-store" }
  ).then((res) => res.json() as Promise<{ data?: { started_at: string }[] }>);

  const stream = streamRes.data?.[0];
  if (!stream) return null;

  // Markers come oldest first, max 100 per page, so walk to the last page
  const markers: VOD["markers"] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = (await fetch(
      `https://api.twitch.tv/helix/streams/markers?user_id=${userId}&first=100${
        cursor ? `&after=${cursor}` : ""
      }`,
      { headers: generateTwitchRequestHeaders(token), cache: "no-store" }
    ).then((res) => res.json())) as TwitchMarkersResponse;

    markers.push(...(res.data?.[0]?.videos?.[0]?.markers ?? []));
    cursor = res.pagination?.cursor;
    if (!cursor) break;
  }

  const streamStart = Date.parse(stream.started_at);

  // Offset markers are not topics, so skip them. Also skip markers from an
  // older stream, in case Twitch has not made a VOD for this one yet.
  const topics = markers
    .filter((marker) => Date.parse(marker.created_at) >= streamStart)
    .map((marker) => {
      const { rewindSeconds, description } = parseRewind(marker.description);
      return {
        ...parseMetadataFromMarker(description),
        startedAt: Math.max(
          Date.parse(marker.created_at) - rewindSeconds * 1000,
          streamStart
        ),
      };
    })
    .filter((topic): topic is LiveTopic => topic.type !== "offset")
    .sort((a, b) => a.startedAt - b.startedAt);

  // Same "Intro" fallback as the VOD page
  return (
    topics[topics.length - 1] ?? {
      label: "Intro",
      type: "start",
      startedAt: streamStart,
    }
  );
};
