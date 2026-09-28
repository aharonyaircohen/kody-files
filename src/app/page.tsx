import { FileManagerApp } from "@/app/files/FileManagerApp";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ path?: string | string[] }>;
}) {
  const { path } = await searchParams;
  return <FileManagerApp initialPath={typeof path === "string" ? path : ""} />;
}
