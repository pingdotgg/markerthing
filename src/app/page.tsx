import About from "./(components)/about";

export default async function Home() {
  return (
    <div className="my-auto flex flex-col items-center justify-center">
      {/* @ts-expect-error Server Component */}
      <About />
    </div>
  );
}
