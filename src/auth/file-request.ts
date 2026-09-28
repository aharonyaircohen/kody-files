import { z } from "zod";

export const repository = z.object({
  owner: z.string().regex(/^[A-Za-z0-9-]{1,39}$/),
  repo: z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/),
});

export function isSafeRepoPath(value: string): boolean {
  return !value.startsWith("/") &&
    !value.includes("\\") &&
    value.split("/").every((segment) => segment !== "." && segment !== "..");
}

const path = z.string().max(2048).refine(isSafeRepoPath);
const filePath = path.min(1);
const mutation = z.object({
  sourcePath: filePath,
  sourceType: z.enum(["file", "dir", "symlink"]),
  targetPath: filePath,
});

export const fileRequest = z.discriminatedUnion("op", [
  repository.extend({ op: z.literal("listDir"), path }),
  repository.extend({ op: z.literal("readFile"), path: filePath }),
  repository.extend({ op: z.literal("writeFile"), path: filePath, content: z.string(), expectedVersion: z.string().nullable().optional() }),
  repository.extend({ op: z.literal("deleteFile"), path: filePath, type: z.enum(["file", "dir", "symlink"]).optional() }),
  repository.extend({ op: z.literal("createFolder"), path: filePath }),
  repository.extend({ op: z.literal("movePath"), mutation }),
  repository.extend({ op: z.literal("duplicatePath"), mutation }),
  repository.extend({ op: z.literal("search"), query: z.string().min(1).max(500) }),
  repository.extend({ op: z.literal("history"), path: filePath, limit: z.number().int().min(1).max(100) }),
  repository.extend({ op: z.literal("readVersion"), path: filePath, version: z.string().min(1).max(100) }),
]);

export type FileRequest = z.infer<typeof fileRequest>;
