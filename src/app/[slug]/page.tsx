import { Suspense } from "react";
import { LoadingPage } from "~/components/loading";
import { VODs } from "../_components/vods";

export const dynamic = "force-dynamic";
// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 60;

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ after?: string | string[] }>;
}) {
  const [{ slug }, { after }] = await Promise.all([params, searchParams]);
  const cursor = typeof after === "string" ? after : undefined;
  // Next keeps this div when only ?after changes. The key makes each VOD page
  // a new div, so the scroll goes back to the top and the loading state shows.
  return (
    <div
      key={cursor}
      className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto"
    >
      <Suspense fallback={<LoadingPage />}>
        <VODs username={slug} after={cursor} />
      </Suspense>
    </div>
  );
}
