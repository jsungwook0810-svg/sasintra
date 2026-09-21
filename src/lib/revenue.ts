export function parseRevenueAmount(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function summarizeRevenue(records: Array<{ userId: string; month: string; amount: number }>, userId: string, year: string) {
  const totals = Array.from({ length: 12 }, (_, i) => ({
    month: year + '-' + String(i + 1).padStart(2, '0'), amount: 0, count: 0
  }));
  for (const record of records) {
    if (record.userId !== userId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(record.month) ||
        record.month.slice(0, 4) !== year || !Number.isSafeInteger(record.amount) || record.amount < 0) continue;
    const row = totals[Number(record.month.slice(5)) - 1];
    row.amount += record.amount;
    row.count++;
  }
  return { months: totals, annual: totals.reduce((sum, row) => sum + row.amount, 0) };
}
