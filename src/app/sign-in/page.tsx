import { SignIn } from "@clerk/nextjs/app-beta";

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  return (
    <div className="flex justify-center p-8">
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
        redirectUrl={searchParams.redirect_url || "/"}
      />
    </div>
  );
}
