import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { SystemConfig, DEFAULT_SYSTEM_CONFIG } from '@/types';

interface DataContextType {
  allUserReports: any[];
  allLeavesGlobal: any[];
  globalStaffList: any[];
  globalAllReports: any[];
  globalActualRevenues: any[];
  revenueStatus: 'loading' | 'ready' | 'error';
  myMemos: any[];
  notices: any[];
  corpCardUsages: any[];
  notifications: any[];
  systemConfig: SystemConfig;
  updateSystemConfig: (updates: Partial<SystemConfig>) => Promise<void>;
  resetSystemConfigToDefault: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [allUserReports, setAllUserReports] = useState<any[]>([]);
  const [allLeavesGlobal, setAllLeavesGlobal] = useState<any[]>([]);
  const [globalStaffList, setGlobalStaffList] = useState<any[]>([]);
  const [globalAllReports, setGlobalAllReports] = useState<any[]>([]);
  const [globalActualRevenues, setGlobalActualRevenues] = useState<any[]>([]);
  const [revenueStatus, setRevenueStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [myMemos, setMyMemos] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [corpCardUsages, setCorpCardUsages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);

  // System configuration listener
  useEffect(() => {
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'system_settings', 'config');
    const unsubConfig = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<SystemConfig>;
        setSystemConfig({
          ...DEFAULT_SYSTEM_CONFIG,
          ...remoteData,
          feeMap: { ...DEFAULT_SYSTEM_CONFIG.feeMap, ...(remoteData.feeMap || {}) },
          salaryData: {
            ...DEFAULT_SYSTEM_CONFIG.salaryData,
            ...(remoteData.salaryData || {})
          },
          incentiveRates: {
            ...DEFAULT_SYSTEM_CONFIG.incentiveRates,
            ...(remoteData.incentiveRates || {})
          },
          bonusThresholds: {
            ...DEFAULT_SYSTEM_CONFIG.bonusThresholds,
            ...(remoteData.bonusThresholds || {})
          },
          menuVisibility: {
            ...DEFAULT_SYSTEM_CONFIG.menuVisibility,
            ...(remoteData.menuVisibility || {})
          }
        });
      } else {
        // Initialize with default
        setDoc(configDocRef, DEFAULT_SYSTEM_CONFIG, { merge: true }).catch(console.error);
      }
    });

    return () => unsubConfig();
  }, []);

  const updateSystemConfig = async (updates: Partial<SystemConfig>) => {
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'system_settings', 'config');
    await setDoc(configDocRef, updates, { merge: true });
  };

  const resetSystemConfigToDefault = async () => {
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'system_settings', 'config');
    await setDoc(configDocRef, DEFAULT_SYSTEM_CONFIG);
  };

  useEffect(() => {
    if (!currentUser) return;

    const uid = currentUser.userId;
    const isMaster = currentUser.userId === 'snk12' || currentUser.userId === 'testadmin' || (currentUser as any).isMaster;
    const isAdmin = currentUser.role === '관리자' || isMaster;
    const isTeamLeader = currentUser.rank === '팀장' || currentUser.role === '팀장';
    const hasGlobalAccess = isAdmin || isTeamLeader;

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

    const qRevenues = hasGlobalAccess 
      ? collection(db, 'artifacts', appId, 'public', 'data', 'actual_revenues')
      : query(collection(db, 'artifacts', appId, 'public', 'data', 'actual_revenues'), where("userId", "==", uid));
    
    setRevenueStatus('loading');
    setGlobalActualRevenues([]);
    const unsubRevenues = onSnapshot(qRevenues, { includeMetadataChanges: true }, (snap) => {
      setGlobalActualRevenues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRevenueStatus(snap.metadata.fromCache ? 'loading' : 'ready');
    }, (error) => {
      console.error('Revenue load failed:', error);
      setRevenueStatus('error');
    });

    let unsubStaff: any;
    let unsubAllReports: any;
    let unsubCorpCard: any;

    if (hasGlobalAccess) {
      unsubStaff = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        setGlobalStaffList(snap.docs.map(d => {
          const u = d.data();
          if (u.company === '삼성' && u.role === '간편심사') {
            return { ...u, role: '재물팀' };
          }
          if (u.userId === 'snk12') {
            return { ...u, isMaster: true };
          }
          return u;
        }));
      });
      unsubAllReports = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), (snap) => {
        setGlobalAllReports(snap.docs.map(d => d.data()));
      });
      if (isAdmin || isMaster) {
        unsubCorpCard = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'corp_card_usages'), (snap) => {
          setCorpCardUsages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
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
      allUserReports,
      allLeavesGlobal,
      globalStaffList,
      globalAllReports,
      globalActualRevenues,
      revenueStatus,
      myMemos,
      notices,
      corpCardUsages,
      notifications,
      systemConfig,
      updateSystemConfig,
      resetSystemConfigToDefault
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
