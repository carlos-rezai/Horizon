export interface RendererConfig {
  loadProdRenderer: boolean;
}

export function resolveRendererConfig(
  isPackaged: boolean,
  env: Record<string, string | undefined>
): RendererConfig {
  const forceProdRenderer = env.HORIZON_FORCE_PROD_RENDERER === "1";
  const loadProdRenderer = isPackaged || forceProdRenderer;
  return { loadProdRenderer };
}
