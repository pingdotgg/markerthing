import { SignIn } from "@clerk/nextjs/app-beta";

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  return (
    <div className="my-auto flex items-center justify-center">
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
        redirectUrl={searchParams.redirect_url || "/"}
        appearance={{
          variables: {
            colorPrimary: "#E24A8D",
          },
        }}
      />
    </div>
  );
}
