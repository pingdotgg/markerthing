import { LayoutHelper } from "../_components/layout-helper";

export default async function VODsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  // @ts-expect-error Server Components :(
  return <LayoutHelper slug={params.slug}>{children}</LayoutHelper>;
}
