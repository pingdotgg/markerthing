import { clerkClient, currentUser } from "@clerk/nextjs/app-beta";

export const generateTwitchRequestHeaders = (accessToken?: string) => {
  const headers = new Headers();
  headers.append("Client-ID", process.env.TWITCH_CLIENT_ID!);
  // headers.append("Accept", process.env.TWITCH_CLIENT_SECRET!);

  if (accessToken) headers.append("Authorization", `Bearer ${accessToken}`);

  return headers;
};

export const getTwitchUserId = async (userName: string, token?: string) => {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${userName}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      redirect: "follow",
      cache: "no-store",
    }
  ).then((response) => response.json());
  console.log("user Id get?", res);

  if (res.error === "Unauthorized") throw new Error("Unauthorized");

  console.log("user Id get?", res);
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
    `https://api.twitch.tv/helix/streams/markers?video_id=${vodId}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(tokenForMarkers),
      redirect: "follow",
      cache: "no-store",
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
  const [{ token }] = await clerkClient.users.getUserOauthAccessToken(
    clerkUserId,
    "oauth_twitch"
  );

  return token;
};

export const getValidTokenForCreator = async (creatorName: string) => {
  // Start getting this user's twitch token as a backup
  const backupCurrentUserTokenPromise = currentUser().then((u) =>
    getTwitchTokenFromClerk(u!.id)
  );

  // Get token for the input displayName IF THEY HAVE SIGNED IN BEFORE
  const [creatorFoundInClerk] = await clerkClient.users.getUserList({
    username: [creatorName],
  });

  console.log("found in clerk?", creatorFoundInClerk);

  // Early escape if we don't find this user in Clerk
  if (!creatorFoundInClerk) {
    return await backupCurrentUserTokenPromise;
  }

  return await getTwitchTokenFromClerk(creatorFoundInClerk.id);
};
