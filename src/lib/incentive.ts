export function calculateIncentive(
  revenue: number,
  threshold: number,
  baseRate: number,
  bonusThreshold: number,
  bonusRate: number
) {
  const eligible = revenue > threshold;
  const rate = eligible ? baseRate + (revenue > bonusThreshold ? bonusRate : 0) : 0;
  const incentive = Math.floor(Math.max(0, revenue - threshold) * rate);
  return { eligible, rate, incentive };
}
