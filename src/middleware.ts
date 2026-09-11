import { defineMiddleware } from "astro:middleware";
import { withBase } from "./lib/paths";

// Prerender all case-study URLs with the deployment base. This also covers
// report links and URLs stored in data attributes for galleries and the orbit.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (import.meta.env.BASE_URL === "/" || !response.headers.get("content-type")?.includes("text/html")) return response;
  const html = (await response.text()).replace(
    /(\b(?:href|src|poster|action|data-[\w-]+)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/g,
    (_match, attribute: string, quote: string, path: string) => `${attribute}${quote}${withBase(path)}${quote}`
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
