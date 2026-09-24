import { LayoutHelper } from "../_components/layout-helper";

export default async function VODsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LayoutHelper slug={slug}>{children}</LayoutHelper>;
}
