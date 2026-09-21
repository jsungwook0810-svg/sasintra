export interface User {
  userId: string;
  name: string;
  company: string;
  role: string;
  rank: string;
  approved: boolean;
  joinDate?: string;
  password?: string;
  lastReadNotice?: number;
  isResigned?: boolean;
  resignDate?: string;
  isMaster?: boolean;
  isHidden?: boolean;
}

export interface SalaryRankConfig {
  base: number;
  target: number;
  threshold: number;
  type: string;
}

export interface SystemConfig {
  feeMap: Record<string, number>;
  salaryData: Record<string, Record<string, SalaryRankConfig>>;
  incentiveRates: Record<string, number>;
  bonusRate: number;
  bonusThresholds: Record<string, number>;
  menuVisibility: {
    corpCard: boolean;
    notices: boolean;
    leave: boolean;
    calendar: boolean;
    [key: string]: boolean;
  };
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  feeMap: {
    "시설소유관리자": 100000,
    "300만원 초과": 100000,
    "대인사고": 80000,
    "300만원 이하": 60000,
    "급배수사고": 60000,
    "골프용품": 50000,
    "홀인원": 30000,
    "가전제품": 20000,
    "펫보험": 15000
  },
  salaryData: {
    "누수팀": {
      "사원": { base: 2300000, target: 7000000, threshold: 5600000, type: "normal" },
      "주임": { base: 2400000, target: 7000000, threshold: 5700000, type: "normal" },
      "대리": { base: 2600000, target: 7000000, threshold: 6000000, type: "normal" },
      "과장": { base: 2800000, target: 7000000, threshold: 6400000, type: "normal" }
    },
    "재물팀": {
      "사원": { base: 2300000, target: 6000000, threshold: 5600000, type: "normal" },
      "주임": { base: 2400000, target: 6000000, threshold: 5700000, type: "normal" },
      "대리": { base: 2600000, target: 6000000, threshold: 6000000, type: "normal" },
      "과장": { base: 2800000, target: 6000000, threshold: 6400000, type: "normal" }
    },
    "재물심사": {
      "사원": { base: 2300000, target: 6000000, threshold: 5600000, type: "normal" },
      "주임": { base: 2400000, target: 6000000, threshold: 5700000, type: "normal" },
      "대리": { base: 2600000, target: 6000000, threshold: 6000000, type: "normal" },
      "과장": { base: 2800000, target: 6000000, threshold: 6400000, type: "normal" }
    }
  },
  incentiveRates: {
    '사원': 0.41,
    '주임': 0.42,
    '대리': 0.43,
    '과장': 0.44
  },
  bonusRate: 0.02,
  bonusThresholds: {
    '누수팀': 9500000,
    '재물팀': 8500000,
    '마이브라운': 8500000,
    '재물심사': 8500000
  },
  menuVisibility: {
    corpCard: false, // 법인카드 관리 기본 숨김
    notices: false,
    leave: false,
    calendar: false
  }
};
