import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "sas-sas-5259e",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const usersRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'users');
  const snap = await getDocs(usersRef);
  let baeId = '';
  snap.forEach(doc => {
    if (doc.data().name === '배예진') baeId = doc.data().userId;
  });
  
  const reportsRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'reports');
  const q = query(reportsRef, where('userId', '==', baeId));
  const rSnap = await getDocs(q);
  rSnap.forEach(doc => {
    const d = doc.data();
    console.log(d.date);
  });

  const revRef = collection(db, 'artifacts', 'sas-v4-final', 'public', 'data', 'actual_revenues');
  const revQ = query(revRef, where('userId', '==', baeId));
  const revSnap = await getDocs(revQ);
  revSnap.forEach(doc => {
    const d = doc.data();
    console.log("Rev:", d.month, d.amount);
  });
  
  process.exit(0);
}
main();
