import { clerkClient } from "@clerk/nextjs/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getVodWithMarkers,
  TwitchMarkerAccessDeniedError,
} from "./twitch-server";

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

const vod = { created_at: "2026-09-24T00:00:00Z", duration: "1h0m0s" };
const videoResponse = () =>
  new Response(JSON.stringify({ data: [vod] }), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("getVodWithMarkers", () => {
  it("uses the viewer's token for private markers", async () => {
    const markers = [
      {
        id: "marker-1",
        created_at: "2026-09-24T00:05:00Z",
        description: "Topic",
        position_seconds: 300,
        URL: "https://twitch.tv/example",
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(videoResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ videos: [{ markers }] }] }), {
          status: 200,
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getVodWithMarkers("123", "viewer-token")).resolves.toEqual({
      ...vod,
      markers,
    });
    const markerRequest = fetchMock.mock.calls[1]![1] as RequestInit;
    expect(new Headers(markerRequest.headers).get("Authorization")).toBe(
      "Bearer viewer-token"
    );
    expect(markerRequest.cache).toBe("no-store");
    expect(clerkClient).not.toHaveBeenCalled();
  });

  it("denies access when Twitch rejects the viewer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(videoResponse())
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getVodWithMarkers("123", "viewer-token")
    ).rejects.toBeInstanceOf(TwitchMarkerAccessDeniedError);
    expect(clerkClient).not.toHaveBeenCalled();
  });

  it.each([401, 500])(
    "does not turn Twitch %i into empty markers",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(videoResponse())
          .mockResolvedValueOnce(new Response(null, { status }))
      );

      await expect(getVodWithMarkers("123", "viewer-token")).rejects.toThrow(
        `Could not load markers: Twitch returned ${status}`
      );
    }
  );
});
