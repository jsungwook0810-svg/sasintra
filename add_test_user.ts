import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_A_pjVLhhO4fRcbR7LoB94TBFO0m_pLE",
  authDomain: "sas-sas-5259e.firebaseapp.com",
  projectId: "sas-sas-5259e",
  storageBucket: "sas-sas-5259e.firebasestorage.app",
  messagingSenderId: "682471076362",
  appId: "1:682471076362:web:3809543a4e4c0131eb25f3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appIdStr = 'sas-v4-final';

async function addTestUser() {
  try {
    await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', 'testadmin'), {
      userId: 'testadmin',
      password: 'adminpassword',
      name: '테스트계정',
      joinDate: '2026-04-16',
      approved: true,
      company: '전체',
      role: '관리자',
      rank: '팀장',
      createdAt: Date.now(),
      isHidden: true
    });
    console.log("Test user added successfully.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

addTestUser();
