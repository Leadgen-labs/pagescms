/** Production can be switched by setting these variables for a new deployment. */
export function getHetznerPostgresCredentials(env: NodeJS.ProcessEnv = process.env) {
  const connection = env.PAGES_CMS_HETZNER_DATABASE_URL;
  const certificates = env.PAGES_CMS_HETZNER_TLS;
  if (!connection && !certificates) return undefined;
  if (!connection || !certificates) throw new Error("Incomplete Hetzner PostgreSQL configuration.");

  try {
    const url = new URL(connection);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname ||
        !url.username || !url.password || url.pathname.length < 2 || url.search || url.hash) {
      throw new Error("Invalid connection settings.");
    }
    const { ca, cert, key } = JSON.parse(certificates);
    if (typeof ca !== "string" || typeof cert !== "string" || typeof key !== "string" ||
        !ca.startsWith("-----BEGIN CERTIFICATE-----") || !cert.startsWith("-----BEGIN CERTIFICATE-----") ||
        !/^-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(key)) {
      throw new Error("Invalid certificate settings.");
    }
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      ssl: { ca, cert, key, servername: url.hostname, rejectUnauthorized: true },
    };
  } catch {
    throw new Error("Invalid Hetzner PostgreSQL configuration.");
  }
}
