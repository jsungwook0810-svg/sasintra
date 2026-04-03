import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';
import { useAuth } from './AuthContext';

interface DataContextType {
  allUserReports: any[];
  allLeavesGlobal: any[];
  globalStaffList: any[];
  globalAllReports: any[];
  globalActualRevenues: any[];
  myMemos: any[];
  notices: any[];
  corpCardUsages: any[];
  notifications: any[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [allUserReports, setAllUserReports] = useState<any[]>([]);
  const [allLeavesGlobal, setAllLeavesGlobal] = useState<any[]>([]);
  const [globalStaffList, setGlobalStaffList] = useState<any[]>([]);
  const [globalAllReports, setGlobalAllReports] = useState<any[]>([]);
  const [globalActualRevenues, setGlobalActualRevenues] = useState<any[]>([]);
  const [myMemos, setMyMemos] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [corpCardUsages, setCorpCardUsages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const uid = currentUser.userId;
    const isAdmin = currentUser.role === '관리자';

    const qReports = query(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), where("userId", "==", uid));
    const unsubReports = onSnapshot(qReports, (snap) => {
      setAllUserReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubLeaves = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'), (snap) => {
      setAllLeavesGlobal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMemos = onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'personal_memos'), (snap) => {
      setMyMemos(snap.docs.map(d => d.data()));
    });

    const unsubNotices = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setNotices(data);
    });

    const unsubNotifications = onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'notifications'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(data);
    });

    const qRevenues = isAdmin 
      ? collection(db, 'artifacts', appId, 'public', 'data', 'actual_revenues')
      : query(collection(db, 'artifacts', appId, 'public', 'data', 'actual_revenues'), where("userId", "==", uid));
    
    const unsubRevenues = onSnapshot(qRevenues, (snap) => {
      setGlobalActualRevenues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    let unsubStaff: any;
    let unsubAllReports: any;
    let unsubCorpCard: any;

    if (isAdmin) {
      unsubStaff = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        setGlobalStaffList(snap.docs.map(d => d.data()));
      });
      unsubAllReports = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), (snap) => {
        setGlobalAllReports(snap.docs.map(d => d.data()));
      });
      unsubCorpCard = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'corp_card_usages'), (snap) => {
        setCorpCardUsages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsubReports();
      unsubLeaves();
      unsubMemos();
      unsubNotices();
      unsubNotifications();
      unsubRevenues();
      if (unsubStaff) unsubStaff();
      if (unsubAllReports) unsubAllReports();
      if (unsubCorpCard) unsubCorpCard();
    };
  }, [currentUser]);

  return (
    <DataContext.Provider value={{
      allUserReports, allLeavesGlobal, globalStaffList, globalAllReports, globalActualRevenues, myMemos, notices, corpCardUsages, notifications
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
