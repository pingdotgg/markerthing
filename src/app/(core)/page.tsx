import About from "../(components)/about.mdx";

export const runtime = "nodejs";

export default async function Home() {
  return (
    <div className="my-auto flex flex-col items-center justify-center">
      <About />
    </div>
  );
}
