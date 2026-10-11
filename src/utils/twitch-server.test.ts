import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestVodWithMarkers, getVodWithMarkers } from "./twitch-server";

// The creator has signed in before, so Clerk has their Twitch token
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      getUserList: async () => ({ data: [{ id: "creator" }] }),
      getUserOauthAccessToken: async () => ({
        data: [{ token: "creator-token" }],
      }),
    },
  }),
}));

const vod = {
  created_at: "2026-09-24T00:00:00Z",
  duration: "1h0m0s",
  user_login: "creator",
};

// Stubs the videos request, then the markers request
const stubTwitch = (markersResponse: Response) =>
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: [vod] }))
      .mockResolvedValueOnce(markersResponse)
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getVodWithMarkers", () => {
  it("throws when the markers request fails", async () => {
    stubTwitch(
      Response.json({ error: "Unauthorized", status: 401 }, { status: 401 })
    );

    await expect(getVodWithMarkers("123", "viewer-token")).rejects.toThrow(
      "Twitch markers request failed: 401"
    );
  });

  it("gives no markers when Twitch sends an empty videos list", async () => {
    stubTwitch(Response.json({ data: [{ videos: [] }] }));

    await expect(getVodWithMarkers("123", "viewer-token")).resolves.toEqual({
      ...vod,
      markers: [],
    });
  });
});

describe("getLatestVodWithMarkers", () => {
  const video = (id: string, stream_id: string) => ({
    id,
    stream_id,
    title: `Stream ${id}`,
    url: `https://www.twitch.tv/videos/${id}`,
    created_at: "2026-10-07T00:00:00Z",
    duration: "1h0m0s",
    user_login: "creator",
    view_count: 10,
  });
  const marker = (id: string) => ({
    id,
    created_at: "2026-10-07T00:10:00Z",
    description: `Topic ${id}`,
    position_seconds: 600,
    URL: "",
  });

  it("skips the live VOD and loads every marker page", async () => {
    const fetch = vi.fn(async (url: string) => {
      const { pathname, searchParams } = new URL(url);
      if (pathname.endsWith("/users"))
        return Response.json({ data: [{ id: "u1" }] });
      if (pathname.endsWith("/videos")) {
        return Response.json({
          data: [video("live", "s2"), video("done", "s1")],
        });
      }
      if (pathname.endsWith("/streams"))
        return Response.json({ data: [{ id: "s2" }] });
      // Markers: two pages, only for the finished VOD
      expect(searchParams.get("video_id")).toBe("done");
      return searchParams.get("after")
        ? Response.json({ data: [{ videos: [{ markers: [marker("b")] }] }] })
        : Response.json({
            data: [{ videos: [{ markers: [marker("a")] }] }],
            pagination: { cursor: "next" },
          });
    });
    vi.stubGlobal("fetch", fetch);

    const { url, title, created_at, duration } = video("done", "s1");
    await expect(getLatestVodWithMarkers("creator")).resolves.toEqual({
      vod: {
        id: "done",
        title,
        url,
        created_at,
        duration,
        user_login: "creator",
      },
      markers: [marker("a"), marker("b")],
    });
  });
});
