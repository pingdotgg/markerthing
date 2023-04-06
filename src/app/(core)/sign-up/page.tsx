import { SignUp } from "@clerk/nextjs/app-beta";

export const runtime = "nodejs";

export default function Page() {
  return (
    <div className="my-auto flex items-center justify-center">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        appearance={{
          variables: {
            colorPrimary: "#E24A8D",
          },
        }}
      />
    </div>
  );
}
