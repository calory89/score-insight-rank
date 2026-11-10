// Router side of the Spanish URLs (see src/lib/esPath.ts).
import { Navigate, useLocation } from "react-router-dom";
import { ES_BOOT, isEsPath, stripEs, routerBase } from "./esPath";

export { routerBase };

/** Route "/es/*". Reached when code navigates to a full Spanish address ("/es/deal/x", e.g. a saved return path or
 * the "next" of a sign-in link):
 *  - app already running under /es: the router added its own prefix, so drop the extra one;
 *  - app running without the prefix: load the Spanish URL for real, so the whole page is in Spanish. */
export function EsHop() {
  const loc = useLocation();
  if (ES_BOOT) return <Navigate to={stripEs(loc.pathname) + loc.search + loc.hash} replace />;
  if (typeof window !== "undefined" && isEsPath(window.location.pathname)) window.location.replace(window.location.href);
  return null;
}
