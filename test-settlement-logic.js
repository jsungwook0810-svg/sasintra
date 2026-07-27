const month = '2026-04'; // April

// mock u
const u = {
  userId: 'bae',
  company: '삼성',
  role: '누수팀',
  rank: '대리',
  approved: true,
  isResigned: true,
  resignDate: '2026-03-20',
  joinDate: '2026-02-02',
};

const hasReportsThisMonth = false;
const hasRevenueThisMonth = false;

if (u.role === '관리자') { console.log('returned role admin'); process.exit(0); }
if (u.rank === '팀장' && !hasReportsThisMonth && !hasRevenueThisMonth) { console.log('returned rank team leader'); process.exit(0); }
if (u.joinDate && u.joinDate.substring(0, 7) > month) { console.log('returned joinDate'); process.exit(0); }

const companiesThisMonth = new Set();
companiesThisMonth.add(u.company);

if (!u.approved && !hasReportsThisMonth && !hasRevenueThisMonth) { console.log('returned not approved'); process.exit(0); }
if (u.isResigned) {
  const resignMonth = u.resignDate ? u.resignDate.substring(0, 7) : '';
  if (resignMonth && resignMonth < month && !hasReportsThisMonth && !hasRevenueThisMonth) { 
    console.log('returned resigned < month'); 
    process.exit(0); 
  }
}

console.log('Did NOT return! Passed all filters!');
