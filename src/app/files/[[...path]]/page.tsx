import { FileManagerApp } from "@/app/files/FileManagerApp";

export default async function FilesRoute({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  return <FileManagerApp initialPath={path.join("/")} />;
}
