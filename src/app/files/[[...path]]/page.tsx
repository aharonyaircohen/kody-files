import { redirect } from "next/navigation";

export default async function LegacyFilesRoute({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  redirect(path.length ? `/?path=${encodeURIComponent(path.join("/"))}` : "/");
}
