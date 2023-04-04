import { currentUser } from "@clerk/nextjs/app-beta";
import { ButtonLink } from "./(components)/common/button";

export const dynamic = "force-dynamic";
// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 0;

export default async function Home() {
  const self = await currentUser();
  if (!self) throw new Error("you shouldn't be here");
  return (
    <div className="my-auto flex flex-col items-center justify-center">
      {`You're logged in!`}
      <ButtonLink href={`/${self.username}`} className="mt-4">
        Click here to view your VODs
      </ButtonLink>
    </div>
  );
}
