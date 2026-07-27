import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  projectId: "sas-sas-5259e",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const usersRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'users');
  const snap = await getDocs(usersRef);
  const globalStaffList = snap.docs.map(d => d.data());
  fs.writeFileSync('globalStaffList.json', JSON.stringify(globalStaffList, null, 2));
  
  const month = '2026-04';
  const u = globalStaffList.find(u => u.name === '배예진');
  if (!u) {
    console.log("No bae");
    process.exit(0);
  }
  
  const reportsThisMonth = [];
  const hasReportsThisMonth = false;
  const hasRevenueThisMonth = false;

  console.log("Is resigned:", u.isResigned);
  console.log("Resign date:", u.resignDate);

  if (u.isResigned) {
    const resignMonth = u.resignDate ? u.resignDate.substring(0, 7) : '';
    console.log("resignMonth:", resignMonth, "month:", month);
    if (resignMonth && resignMonth < month && !hasReportsThisMonth && !hasRevenueThisMonth) {
       console.log("Should return!");
    } else {
       console.log("Should NOT return!");
    }
  }

  process.exit(0);
}
main();
