import { clerkClient } from "@clerk/nextjs/server";
import { parseMarkerLabel, parseRewind, type TwitchMarker } from "./markers";

const TWITCH_API = "https://api.twitch.tv/helix";

export const generateTwitchRequestHeaders = (accessToken: string) => {
  const headers = new Headers();
  headers.append("Client-ID", process.env.TWITCH_CLIENT_ID!);
  headers.append("Authorization", `Bearer ${accessToken}`);

  return headers;
};

// App access token for public Twitch data. Tokens last for weeks, so each
// server instance keeps one until it is close to expiry.
let appToken: { value: string; expiresAt: number } | undefined;

export const getAppAccessToken = async () => {
  if (appToken && appToken.expiresAt > Date.now() + 60_000) {
    return appToken.value;
  }

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) {
    throw new Error(`Twitch app token request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  appToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return appToken.value;
};

// Twitch can revoke an app token early (for example after a secret rotation).
// Call this after a failed request so the next one mints a new token.
export const dropAppAccessToken = () => {
  appToken = undefined;
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

type TwitchVideo = {
  id: string;
  user_login: string;
  user_name: string;
  title: string;
  created_at: string;
  url: string;
  duration: string; // "8h32m12s"
};

export type VOD = TwitchVideo & { markers: TwitchMarker[] };

const getVideo = async (vodId: string) => {
  const request = async () =>
    fetch(`${TWITCH_API}/videos?id=${encodeURIComponent(vodId)}`, {
      headers: generateTwitchRequestHeaders(await getAppAccessToken()),
      next: { revalidate: 60 },
    });

  let response = await request();
  if (response.status === 401) {
    dropAppAccessToken();
    response = await request();
  }
  // Twitch sends 400 for malformed IDs and 404 for deleted VODs
  if (response.status === 400 || response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`Twitch videos request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: TwitchVideo[] };
  return json.data[0];
};

type MarkersPage = {
  // One entry per user who placed markers (the broadcaster and editors)
  data: { videos: { markers: TwitchMarker[] }[] }[];
  pagination: { cursor?: string };
};

// 50 pages of 100 is far more markers than a stream has. The cap only
// guards against a cursor that never ends.
const MAX_MARKER_PAGES = 50;

// Only the VOD owner and their editors can read markers.
// Returns undefined when this token's user is not one of them.
const getMarkers = async (vodId: string, token: string) => {
  const markers: TwitchMarker[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({ video_id: vodId, first: "100" });
    if (cursor) params.set("after", cursor);

    const response = await fetch(`${TWITCH_API}/streams/markers?${params}`, {
      headers: generateTwitchRequestHeaders(token),
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) return undefined;
    if (!response.ok) {
      throw new Error(`Twitch markers request failed: ${response.status}`);
    }

    const page = (await response.json()) as MarkersPage;
    const pageMarkers = page.data.flatMap((user) =>
      user.videos.flatMap((video) => video.markers)
    );
    markers.push(...pageMarkers);
    cursor = pageMarkers.length > 0 ? page.pagination.cursor : undefined;
    pages++;
  } while (cursor && pages < MAX_MARKER_PAGES);

  return markers;
};

// The user's Twitch token, from the OAuth connection they signed in with
export const getTwitchTokenFromClerk = async (clerkUserId: string) => {
  const clerk = await clerkClient();
  const response = await clerk.users.getUserOauthAccessToken(
    clerkUserId,
    "twitch"
  );
  return response.data[0]?.token;
};

// The creator's Twitch token, if they have signed in to MarkerThing before
const getCreatorToken = async (creatorLogin: string) => {
  const clerk = await clerkClient();
  const response = await clerk.users.getUserList({
    username: [creatorLogin],
  });
  const creator = response.data[0];
  if (!creator) return undefined;

  return getTwitchTokenFromClerk(creator.id);
};

export type VodResult =
  | { status: "ok"; vod: VOD }
  | { status: "not-found" }
  // `rejected` means the creator signed in before, but Twitch refused their token
  | { status: "creator-not-connected"; creator: string; rejected: boolean };

// Loads a VOD and its markers for the signed-in viewer.
// The viewer's own token works for their VODs (and channels they edit), which
// skips the creator lookup in the common case.
export const getVodWithMarkers = async (
  vodId: string,
  viewerClerkId: string
): Promise<VodResult> => {
  const [video, viewerToken] = await Promise.all([
    getVideo(vodId),
    getTwitchTokenFromClerk(viewerClerkId),
  ]);
  if (!video) return { status: "not-found" };

  const viewerMarkers = viewerToken
    ? await getMarkers(vodId, viewerToken)
    : undefined;
  if (viewerMarkers) {
    return { status: "ok", vod: { ...video, markers: viewerMarkers } };
  }

  const creatorToken = await getCreatorToken(video.user_login);
  if (!creatorToken) {
    return {
      status: "creator-not-connected",
      creator: video.user_name,
      rejected: false,
    };
  }

  const markers = await getMarkers(vodId, creatorToken);
  if (!markers) {
    return {
      status: "creator-not-connected",
      creator: video.user_name,
      rejected: true,
    };
  }

  return { status: "ok", vod: { ...video, markers } };
};

export type LiveTopic = {
  label: string;
  type: "start" | "end";
  // Unix ms. Includes any "-2" style rewind on the marker.
  startedAt: number;
};

type LiveMarker = TwitchMarker & { created_at: string };

type TwitchMarkersResponse = {
  data?: { videos?: { markers?: LiveMarker[] }[] }[];
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
  const token = await getCreatorToken(creatorName);
  if (!token) throw new Error("Creator has not signed in to MarkerThing");
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
  const markers: LiveMarker[] = [];
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
