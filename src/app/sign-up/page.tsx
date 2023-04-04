import { SignUp } from "@clerk/nextjs/app-beta";

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  return (
    <div className="my-auto flex items-center justify-center">
      <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
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
