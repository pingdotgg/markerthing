import { LayoutHelper } from "../(components)/layout-helper";

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // @ts-expect-error Server Components :(
  return <LayoutHelper>{children}</LayoutHelper>;
}
