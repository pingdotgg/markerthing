import About from "../_components/about.mdx";

export default async function Home() {
  return (
    <div className="my-auto flex flex-col items-center justify-center">
      <About />
    </div>
  );
}
