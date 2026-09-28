export const TOKEN_KEY = "kody-files-token";
export const REPOSITORY_KEY = "kody-files-repository";
export const THEME_KEY = "kody-files-theme";

export const LEGACY_TOKEN_KEY = "github-files-token";
export const LEGACY_REPOSITORY_KEY = "github-files-repository";
export const LEGACY_THEME_KEY = "github-files-theme";

export function migrateStoredValue(storage: Storage, key: string, legacyKey: string): string | null {
  const current = storage.getItem(key);
  const legacy = storage.getItem(legacyKey);
  if (current === null && legacy !== null) storage.setItem(key, legacy);
  if (legacy !== null) storage.removeItem(legacyKey);
  return current ?? legacy;
}
