import { LayoutHelper } from "../_components/layout-helper";

export default async function VODsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return <LayoutHelper slug={params.slug}>{children}</LayoutHelper>;
}
