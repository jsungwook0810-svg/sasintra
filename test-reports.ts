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
  
  const repRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'reports');
  const repSnap = await getDocs(repRef);
  const globalAllReports = repSnap.docs.map(d => d.data());

  const periodType = 'month';
  const selectedMonth = '2026-04'; // Also try 2026-05

  for (const m of ['2026-03', '2026-04', '2026-05', '2026-07']) {
      console.log(`\nMonth: ${m}`);
      const staffStats = globalStaffList.filter(u => u.role !== '관리자' && !u.isHidden).filter(u => {
        if (u.isResigned && u.resignDate) {
          if (periodType === 'month' && u.resignDate < m + '-01') return false;
        }
        if (!u.joinDate) return true;
        if (periodType === 'month') {
          return u.joinDate <= m + '-31';
        }
        return true;
      });
      staffStats.forEach(u => {
          if (u.name === '배예진' || u.name === '김도균') {
              console.log(u.name);
          }
      });
  }
  
  process.exit(0);
}
main();
