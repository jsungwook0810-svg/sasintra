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
  let u = null;
  snap.forEach(doc => {
    if (doc.data().name === '배예진') u = doc.data();
  });
  console.log("Bae:", u);
  process.exit(0);
}
main();
