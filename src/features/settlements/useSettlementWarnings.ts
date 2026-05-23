import { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api/api";

export interface InsufficientFundsWarning {
  ccAccountId: string;
  fundingAccountId: string;
  settlementAmount: number;
  settlementMonth: string;
  settlementDay: number;
}

export function useSettlementWarnings(): InsufficientFundsWarning[] {
  const [warnings, setWarnings] = useState<InsufficientFundsWarning[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/settlements/warnings`)
      .then((res) => {
        if (!res.ok) return undefined;
        return res.json() as Promise<InsufficientFundsWarning[]>;
      })
      .then((data) => {
        if (data) setWarnings(data);
      })
      .catch(() => {});
  }, []);

  return warnings;
}
