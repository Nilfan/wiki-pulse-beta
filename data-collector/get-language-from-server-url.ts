const LANGUAGE_SUBDOMAIN_PATTERN = /^(?:[a-z]{2,3}|simple)(?:-[a-z0-9]+)*$/;

export function getLanguageFromServerUrl(
  serverUrl: string,
): string | undefined {
  try {
    const hostnameParts = new URL(serverUrl).hostname.split(".");

    if (hostnameParts.length !== 3) {
      return undefined;
    }

    const [language, , topLevelDomain] = hostnameParts;

    if (
      topLevelDomain !== "org" ||
      language === "www" ||
      !LANGUAGE_SUBDOMAIN_PATTERN.test(language)
    ) {
      return undefined;
    }

    return language;
  } catch {
    return undefined;
  }
}
