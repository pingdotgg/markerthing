import About from "./(components)/about";

export const dynamic = "force-dynamic";
// I do the revalidate 0 here because "force-dynamic" doesn't actually work
// See: https://github.com/vercel/next.js/issues/47273
export const revalidate = 0;

export default async function Home() {
  return (
    <div className="my-auto flex flex-col items-center justify-center">
      {/* @ts-expect-error Server Component */}
      <About />
    </div>
  );
}
