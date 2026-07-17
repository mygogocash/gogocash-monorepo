const LOCAL_MONGO_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Opt-in integration specs may use only an explicit loopback Mongo URI.
 * Invalid, absent, or hosted values disable the optional suite instead of
 * being parsed later from inside a skipped describe callback.
 */
export function optionalLocalMongoUri(value: string | undefined) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'mongodb:' || !LOCAL_MONGO_HOSTS.has(url.hostname)) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function localMongoDatabaseUri(base: string, database: string): string {
  const url = new URL(base);
  url.pathname = `/${database}`;
  return url.toString();
}
