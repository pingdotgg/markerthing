import { UserButton, currentUser } from "@clerk/nextjs/app-beta";
import { Suspense } from "react";
import { LoadingPage } from "~/components/loading";
import { VODs } from "./(components)/vods";

export const dynamic = "force-dynamic";

export default async function Home() {
  const self = await currentUser();
  if (!self) throw new Error("you shouldn't be here");
  return (
    <Suspense fallback={<LoadingPage />}>
      {/* @ts-expect-error Server Component */}
      <VODs self={self} username={self.username} />
    </Suspense>
  );
}
