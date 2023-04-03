import { SignUp } from "@clerk/nextjs/app-beta";

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  return (
    <div className="flex justify-center p-8">
      <SignUp path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
