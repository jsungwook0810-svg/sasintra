import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "sas-sas-5259e",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const usersRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'users');
  const snap = await getDocs(usersRef);
  const globalStaffList = snap.docs.map(d => d.data());
  
  const revRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'actual_revenues');
  const revSnap = await getDocs(revRef);
  const globalActualRevenues = revSnap.docs.map(d => d.data());
  
  const repRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'reports');
  const repSnap = await getDocs(repRef);
  const globalAllReports = repSnap.docs.map(d => d.data());

  const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  
  for (const month of months) {
    console.log(`\n--- Month: ${month} ---`);
    let staffCompanyPairs = [];
    globalStaffList.forEach(u => {
      if (u.isHidden) return;
      if (u.name !== '배예진' && u.name !== '김도균') return;
      
      const reportsThisMonth = globalAllReports.filter(r => r.userId === u.userId && r.date.startsWith(month));
      const hasReportsThisMonth = reportsThisMonth.length > 0;
      const hasRevenueThisMonth = globalActualRevenues.some(r => r.userId === u.userId && r.month === month && r.amount !== 0);

      if (u.role === '관리자') return;
      if (u.rank === '팀장' && !hasReportsThisMonth && !hasRevenueThisMonth) return;
      if (u.joinDate && u.joinDate.substring(0, 7) > month) return;

      const companiesThisMonth = new Set(reportsThisMonth.map(r => r.company || u.company));
      companiesThisMonth.add(u.company);

      if (!u.approved && !hasReportsThisMonth && !hasRevenueThisMonth) return;
      if (u.isResigned) {
        const resignMonth = u.resignDate ? u.resignDate.substring(0, 7) : '';
        if (resignMonth && resignMonth < month && !hasReportsThisMonth && !hasRevenueThisMonth) return;
      }

      companiesThisMonth.forEach(comp => {
        staffCompanyPairs.push({ user: u, targetCompany: comp });
      });
    });
    
    staffCompanyPairs.forEach(p => console.log(p.user.name, p.targetCompany));
  }
  
  process.exit(0);
}
main();
