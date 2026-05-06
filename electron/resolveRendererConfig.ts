export interface RendererConfig {
  loadProdRenderer: boolean;
  corsOrigin: string;
}

export function resolveRendererConfig(
  isPackaged: boolean,
  env: Record<string, string | undefined>
): RendererConfig {
  const forceProdRenderer = env.HORIZON_FORCE_PROD_RENDERER === "1";
  const loadProdRenderer = isPackaged || forceProdRenderer;
  const corsOrigin = loadProdRenderer ? "*" : "http://localhost:5173";
  return { loadProdRenderer, corsOrigin };
}
