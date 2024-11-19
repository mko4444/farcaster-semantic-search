import { SearchBar } from "../search";

export default async function DynamicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ query: string }>;
}) {
  return (
    <>
      <SearchBar defaultValue={decodeURIComponent((await params).query)} />
      {children}
    </>
  );
}
