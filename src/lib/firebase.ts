import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC_A_pjVLhhO4fRcbR7LoB94TBFO0m_pLE",
  authDomain: "sas-sas-5259e.firebaseapp.com",
  projectId: "sas-sas-5259e",
  storageBucket: "sas-sas-5259e.firebasestorage.app",
  messagingSenderId: "682471076362",
  appId: "1:682471076362:web:3809543a4e4c0131eb25f3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const appId = 'sas-v4-final';
