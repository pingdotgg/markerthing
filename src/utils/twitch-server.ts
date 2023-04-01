export const generateTwitchRequestHeaders = (accessToken: string) => {
  const headers = new Headers();
  headers.append("Client-ID", process.env.TWITCH_CLIENT_ID!);
  headers.append("Accept", process.env.TWITCH_CLIENT_SECRET!);
  headers.append("Authorization", `Bearer ${accessToken}`);

  return headers;
};
export const getTwitchUserId = async (userName: string, token: string) => {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${userName}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      redirect: "follow",
    }
  ).then((response) => response.json());

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
  const response = await fetch(
    `https://api.twitch.tv/helix/streams/markers?video_id=${vodId}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      redirect: "follow",
    }
  ).then((response) => response.json());

  const mainRes = await fetch(
    `https://api.twitch.tv/helix/videos?id=${vodId}`,
    {
      method: "GET",
      headers: generateTwitchRequestHeaders(token),
      redirect: "follow",
    }
  ).then((response) => response.json());

  const video = response?.data?.[0]?.videos?.[0];

  return { ...mainRes?.data?.[0], ...video } as VOD;
};
