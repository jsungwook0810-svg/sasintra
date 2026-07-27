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
  snap.forEach(doc => {
    const data = doc.data();
    if (data.name === '배예진' || data.name === '김도균') {
      console.log(data.name, data.isResigned, data.resignDate, data.company, data.role, data.rank);
    }
  });
  process.exit(0);
}
main();
