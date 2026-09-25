import { afterEach, describe, expect, it, vi } from "vitest";
import { getTwitchUserId } from "./twitch-server";

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe("getTwitchUserId", () => {
  it("encodes the login and returns the matching ID", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "123" }] }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTwitchUserId("name&other", "app-token")).resolves.toBe(
      "123"
    );
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.twitch.tv/helix/users?login=name%26other"
    );
  });

  it("returns null when Twitch has no account for the login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] })))
    );

    await expect(getTwitchUserId("missing", "app-token")).resolves.toBeNull();
  });

  it("throws a clear error when the Twitch request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    );

    await expect(getTwitchUserId("creator", "bad-token")).rejects.toThrow(
      "Could not look up Twitch user: 401"
    );
  });
});
