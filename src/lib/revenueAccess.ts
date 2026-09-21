interface RevenueActor {
  userId: string;
  role: string;
  isMaster?: boolean;
}

export function isRevenueAdmin(user: RevenueActor | null | undefined): boolean {
  return Boolean(user && (user.role === '관리자' || user.isMaster === true ||
    user.userId === 'snk12' || user.userId === 'testadmin'));
}

export function canEditRevenue(user: RevenueActor | null | undefined, targetUserId: string): boolean {
  return Boolean(user && targetUserId && (user.userId === targetUserId || isRevenueAdmin(user)));
}
