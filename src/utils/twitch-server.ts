import { clerkClient } from "@clerk/nextjs/server";
import type { TwitchMarker } from "./markers";

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

export const getTwitchUserId = async (userName: string, token: string) => {
  const res = await fetch(`${TWITCH_API}/users?login=${userName}`, {
    method: "GET",
    headers: generateTwitchRequestHeaders(token),
    next: { revalidate: Infinity }, // These should never change
  }).then((response) => response.json());
  if (res.error === "Unauthorized") throw new Error("Unauthorized");

  const responseId = (res as any)?.data[0]?.id as string;
  if (!responseId) return null;

  return responseId;
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
  const response = await fetch(
    `${TWITCH_API}/videos?id=${encodeURIComponent(vodId)}`,
    {
      headers: generateTwitchRequestHeaders(await getAppAccessToken()),
      next: { revalidate: 60 },
    }
  );
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

// Only the VOD owner and their editors can read markers.
// Returns undefined when this token's user is not one of them.
const getMarkers = async (vodId: string, token: string) => {
  const markers: TwitchMarker[] = [];
  let cursor: string | undefined;

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
  } while (cursor);

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
  | { status: "creator-not-connected"; creator: string };

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
  const markers = creatorToken
    ? await getMarkers(vodId, creatorToken)
    : undefined;
  if (!markers) {
    return { status: "creator-not-connected", creator: video.user_name };
  }

  return { status: "ok", vod: { ...video, markers } };
};
