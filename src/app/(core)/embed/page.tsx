import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Card } from "~/app/_components/common/card";
import { getEmbedKey } from "~/utils/embed-key";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

// Gives a signed in creator their private OBS embed URL
export default async function EmbedSetupPage() {
  const user = await currentUser();
  if (!user?.username) return <div>You have to be signed in</div>;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const url = `${protocol}://${host}/embed/${
    user.username
  }?key=${await getEmbedKey(user.username)}`;

  return (
    <div className="my-auto flex flex-col items-center justify-center p-4">
      <Card className="flex w-full max-w-xl flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">OBS embed</h1>
        <p className="text-sm text-gray-300">
          Shows your current marker and how long it has been going. Add it in
          OBS as a Browser Source or a Custom Browser Dock. Keep this link
          private.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="font-mono min-w-0 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white"
          />
          <CopyButton text={url} />
        </div>
        <iframe
          src={url}
          title="Embed preview"
          className="h-32 w-full rounded border border-gray-700"
        />
      </Card>
    </div>
  );
}
