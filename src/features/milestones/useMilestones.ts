import { useState, useEffect } from "react";
import type { Milestone, NewMilestone } from "../../types/milestone";
import { API_BASE } from "../../utils/api";

interface UseMilestonesResult {
  milestones: Milestone[];
  isLoading: boolean;
  error: string | null;
  addMilestone: (data: NewMilestone) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
}

export function useMilestones(): UseMilestonesResult {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/milestones`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch milestones: ${res.status}`);
        return res.json() as Promise<Milestone[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setMilestones(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function addMilestone(data: NewMilestone): Promise<void> {
    const res = await fetch(`${API_BASE}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create milestone: ${res.status}`);
    const created = (await res.json()) as Milestone;
    setMilestones((prev) => [...prev, created]);
  }

  async function deleteMilestone(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/milestones/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete milestone: ${res.status}`);
    setMilestones((prev) => prev.filter((m) => m._id !== id));
  }

  return { milestones, isLoading, error, addMilestone, deleteMilestone };
}
