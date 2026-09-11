/** Resolve a site-root URL for both local previews and GitHub project Pages. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}#`) || path.startsWith(`${base}?`)) return path;
  return `${base}${path}`;
}
