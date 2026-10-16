/**
 * The Paydown Bridge on the client: the straight line the server draws from
 * the Original Principal in the Mortgage Start month to the Restschuld in the
 * Mortgage's first known month. The server derives the line; this rule only
 * reads its extent off the points.
 */
import type { HistoryPoint } from "../historyTypes/historyTypes";

/** The Paydown Bridge's extent: its first and last month and what it spans. */
export interface PaydownBridgeSpan {
  /** "YYYY-MM" — the Mortgage Start month. */
  from: string;
  /** "YYYY-MM" — the Mortgage's first known month. */
  to: string;
  /** Original Principal minus the Restschuld where the bridge ends, in cents. */
  paidOff: number;
}

/** The bridge's extent across the full History, or null when there is none. */
export function paydownBridgeSpan(
  points: HistoryPoint[]
): PaydownBridgeSpan | null {
  const bridged = points.filter(
    (p): p is HistoryPoint & { restschuldBridge: number } =>
      p.restschuldBridge !== null && p.restschuldBridge !== undefined
  );
  if (bridged.length === 0) return null;
  const first = bridged[0];
  const last = bridged[bridged.length - 1];
  return {
    from: first.month,
    to: last.month,
    paidOff: first.restschuldBridge - last.restschuldBridge,
  };
}
