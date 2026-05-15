export function eurosToCents(euros: string): number {
  return Math.round((parseFloat(euros) + Number.EPSILON) * 100);
}

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}
