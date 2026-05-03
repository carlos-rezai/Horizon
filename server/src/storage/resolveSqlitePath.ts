export function resolveSqlitePath(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): string {
  return env.HORIZON_DB_PATH ?? "./horizon.db";
}
