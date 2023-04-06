import { SignIn } from "@clerk/nextjs/app-beta";

export const runtime = "nodejs";

export default function Page() {
  return (
    <div className="my-auto flex items-center justify-center">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          variables: {
            colorPrimary: "#E24A8D",
          },
        }}
      />
    </div>
  );
}
