import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import {
  getLatestPublicTheoStream,
  PublicStreamError,
} from "~/utils/twitch-server";

vi.mock("~/utils/twitch-server", () => ({
  getLatestPublicTheoStream: vi.fn(),
  PublicStreamError: class extends Error {
    constructor(public code: string, public status: number, message: string) {
      super(message);
    }
  },
}));
afterEach(() => vi.resetAllMocks());
it("returns public data without caller authentication and forbids caching", async () => {
  vi.mocked(getLatestPublicTheoStream).mockResolvedValue({
    id: "123",
  } as Awaited<ReturnType<typeof getLatestPublicTheoStream>>);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ id: "123" });
});
it("preserves expected offline/no-archive errors", async () => {
  vi.mocked(getLatestPublicTheoStream).mockRejectedValue(
    new PublicStreamError("channel_live", 409, "The channel is still live.")
  );
  const response = await GET();
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: "channel_live" });
});
it("does not leak upstream tokens or Clerk error details", async () => {
  vi.mocked(getLatestPublicTheoStream).mockRejectedValue(
    new Error("private-token and Clerk details")
  );
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toMatch(/private-token|Clerk/);
});
