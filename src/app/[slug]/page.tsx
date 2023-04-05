import { Suspense } from "react";
import { LoadingPage } from "~/components/loading";
import { VODs } from "~/(components)/vods";

export const dynamic = "force-dynamic";
// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 0;

export default async function Home({ params }: { params: { slug: string } }) {
  return (
    <div className="flex min-h-0 flex-1">
      <Suspense fallback={<LoadingPage />}>
        {/* @ts-expect-error Server Component */}
        <VODs username={params.slug} />
      </Suspense>
    </div>
  );
}
