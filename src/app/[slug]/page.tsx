import { currentUser } from "@clerk/nextjs/app-beta";
import { Suspense } from "react";
import { LoadingPage } from "~/components/loading";
import { VODs } from "../(components)/vods";

export const dynamic = "force-dynamic";
// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 0;

export default async function Home({ params }: { params: { slug: string } }) {
  const self = await currentUser();
  if (!self) throw new Error("you shouldn't be here");
  return (
    <div className="flex h-screen w-full grow flex-col items-center justify-center">
      <Suspense fallback={<LoadingPage />}>
        {/* @ts-expect-error Server Component */}
        <VODs self={self} username={params.slug} />
      </Suspense>
    </div>
  );
}
