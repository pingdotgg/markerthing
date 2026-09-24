import { LayoutHelper } from "../_components/layout-helper";

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutHelper>{children}</LayoutHelper>;
}
