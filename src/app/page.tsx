import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
import { currentUser, SignIn } from "@clerk/nextjs/app-beta";
import { Suspense } from "react";
import { LoadingPage } from "~/components/loading";
import { CustomSignIn } from "./sign-in";

export const dynamic = "force-dynamic";

export default async function Home() {
  const self = await currentUser();
  return (
    <div className="flex h-screen w-full grow flex-col justify-center items-center">
      {!self && <CustomSignIn />}
      {self && (
        <Suspense fallback={<LoadingPage />}>
          {/* @ts-expect-error Server Component */}
          Content
        </Suspense>
      )}
    </div>
  );
}
