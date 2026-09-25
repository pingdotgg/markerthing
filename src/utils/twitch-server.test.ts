import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake Clerk: which Clerk users exist, and the Twitch token each one holds
const clerk = vi.hoisted(() => {
  const state = {
    creators: { creator: "creator-id" } as Record<string, string>,
    tokens: {} as Record<string, string>,
  };
  const users = {
    getUserOauthAccessToken: async (userId: string) => ({
      data: state.tokens[userId] ? [{ token: state.tokens[userId] }] : [],
    }),
    getUserList: vi.fn(async ({ username }: { username: string[] }) => ({
      data: state.creators[username[0]!]
        ? [{ id: state.creators[username[0]!] }]
        : [],
    })),
  };
  return { state, users };
});
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: clerk.users }),
}));

import { getVodWithMarkers } from "./twitch-server";

const video = { id: "v1", user_login: "creator", user_name: "Creator" };
const marker = (id: string) => ({
  id,
  position_seconds: 60,
  description: id,
  created_at: "2026-09-23T17:00:00Z",
});

// Fake Twitch: only "creator-token" can read markers. They come back in
// 2 pages, grouped by the user who placed them (the creator and an editor).
const twitch = vi.fn(async (url: string, init?: RequestInit) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  if (url.startsWith("https://id.twitch.tv/oauth2/token")) {
    return json({ access_token: "app-token", expires_in: 3600 });
  }
  if (url.includes("/videos?id=v1")) return json({ data: [video] });
  if (url.includes("/videos?")) return json({ data: [] });

  const auth = new Headers(init?.headers).get("Authorization");
  if (auth === "Bearer broken-token") return json({}, 500);
  if (auth !== "Bearer creator-token") return json({}, 403);
  if (!url.includes("after=")) {
    return json({
      data: [
        { videos: [{ markers: [marker("m1")] }] },
        { videos: [{ markers: [marker("m2")] }] },
      ],
      pagination: { cursor: "page-2" },
    });
  }
  return json({
    data: [{ videos: [{ markers: [marker("m3")] }] }],
    pagination: {},
  });
});

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = "client-id";
  process.env.TWITCH_CLIENT_SECRET = "client-secret";
  clerk.state.creators = { creator: "creator-id" };
  clerk.state.tokens = { "creator-id": "creator-token" };
  clerk.users.getUserList.mockClear();
  vi.stubGlobal("fetch", twitch);
});

const markerIds = async (viewerId: string) => {
  const result = await getVodWithMarkers("v1", viewerId);
  return result.status === "ok" ? result.vod.markers.map((m) => m.id) : result;
};

describe("getVodWithMarkers", () => {
  it("uses the owner's own token and reads every page and user", async () => {
    expect(await markerIds("creator-id")).toEqual(["m1", "m2", "m3"]);
    expect(clerk.users.getUserList).not.toHaveBeenCalled();
  });

  it("falls back to the creator's token for other viewers", async () => {
    clerk.state.tokens["viewer-id"] = "viewer-token";

    expect(await markerIds("viewer-id")).toEqual(["m1", "m2", "m3"]);
    expect(clerk.users.getUserList).toHaveBeenCalledWith({
      username: ["creator"],
    });
  });

  it("tells a creator who never signed in from one who must sign in again", async () => {
    clerk.state.creators = {};
    expect(await markerIds("viewer-id")).toEqual({
      status: "creator-not-connected",
      creator: "Creator",
      rejected: false,
    });

    clerk.state.creators = { creator: "creator-id" };
    clerk.state.tokens = { "creator-id": "revoked-token" };
    expect(await markerIds("viewer-id")).toEqual({
      status: "creator-not-connected",
      creator: "Creator",
      rejected: true,
    });
  });

  it("throws when Twitch fails, instead of showing no markers", async () => {
    clerk.state.tokens = { "creator-id": "broken-token" };

    await expect(getVodWithMarkers("v1", "creator-id")).rejects.toThrow(
      "Twitch markers request failed: 500"
    );
  });

  it("returns not-found for a VOD Twitch does not have", async () => {
    expect(await getVodWithMarkers("gone", "creator-id")).toEqual({
      status: "not-found",
    });
  });
});
