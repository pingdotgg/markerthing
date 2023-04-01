import { SignIn } from "@clerk/nextjs/app-beta";

export default function Page() {
  return (
    <div className="flex justify-center p-8">
      <SignIn signUpUrl="/sign-up" />
    </div>
  );
}
