export function getSiteUrl() {
  return (process.env.SITE_URL || "https://sentinelidentity.ca").replace(/\/$/, "");
}

export function getBaseUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}
