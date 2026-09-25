import { afterEach, describe, expect, it, vi } from "vitest";
import { getVodWithMarkers } from "./twitch-server";

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
