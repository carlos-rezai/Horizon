export interface Milestone {
  _id: string;
  name: string;
  accountId: string;
  targetBalance: number;
}

export interface NewMilestone {
  name: string;
  accountId: string;
  targetBalance: number;
}
