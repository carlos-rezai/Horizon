export interface ResolvedSqliteOptions {
  verbose?: (sql: string) => void;
}

export function resolveSqliteOptions(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): ResolvedSqliteOptions {
  if (env.DEBUG_SQL === "1") {
    return { verbose: (sql: string) => console.info(sql) };
  }
  return {};
}
