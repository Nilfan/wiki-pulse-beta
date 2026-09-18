export const WIKI_DOMAIN = "/wiki/";

/** Paths are stored percent-encoded; a malformed one is shown as stored. */
export function decodePath(path: string) {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/**
 * /wiki/page-path -> page-path
 * @param path
 * @returns string
 */
export function removeWikiPart(path: string) {
  return path.startsWith(WIKI_DOMAIN) ? path.replace(WIKI_DOMAIN, "") : path;
}
