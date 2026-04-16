export const KOR_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "신정", "2026-02-16": "설날 연휴", "2026-02-17": "설날", "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절", "2026-03-02": "대체공휴일", "2026-05-05": "어린이날", "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일", "2026-06-03": "선거", "2026-06-06": "현충일", "2026-08-15": "광복절",
  "2026-09-24": "추석 연휴", "2026-09-25": "추석", "2026-09-26": "추석 연휴", "2026-10-03": "개천절",
  "2026-10-09": "한글날", "2026-12-25": "성탄절"
};

export const feeMap: Record<string, number> = {
  "시설소유관리자": 100000, "300만원 초과": 100000, "300만원 이하": 60000, "급배수사고": 60000,
  "골프용품": 50000, "홀인원": 30000, "가전제품": 20000, "펫보험": 15000
};

export const reportStructure: Record<string, Record<string, string[]>> = {
  "삼성": {
    "누수팀": ["시설소유관리자", "300만원 초과", "300만원 이하", "급배수사고"],
    "재물팀": ["골프용품", "홀인원", "가전제품", "펫보험"],
    "간편심사": ["홀인원", "가전제품", "펫보험"]
  },
  "마이브라운": {
    "재물심사": ["펫보험"],
    "재물팀": ["펫보험"]
  }
};

export const salaryData: Record<string, Record<string, { base: number, target: number, threshold: number, type: string }>> = {
  "누수팀": {
    "사원": { base: 2500000, target: 5400000, threshold: 5400000, type: "new_tiered" },
    "주임": { base: 2750000, target: 5700000, threshold: 5700000, type: "new_tiered" },
    "대리": { base: 3000000, target: 6000000, threshold: 6000000, type: "new_tiered" },
    "과장": { base: 3250000, target: 6500000, threshold: 6500000, type: "new_tiered" }
  },
  "재물팀": {
    "사원": { base: 2300000, target: 5100000, threshold: 5100000, type: "new_tiered" },
    "주임": { base: 2400000, target: 5400000, threshold: 5400000, type: "new_tiered" },
    "대리": { base: 2600000, target: 5700000, threshold: 5700000, type: "new_tiered" },
    "과장": { base: 2800000, target: 6000000, threshold: 6000000, type: "new_tiered" }
  },
  "간편심사": {
    "사원": { base: 2300000, target: 5100000, threshold: 5100000, type: "new_tiered" },
    "주임": { base: 2400000, target: 5400000, threshold: 5400000, type: "new_tiered" },
    "대리": { base: 2600000, target: 5700000, threshold: 5700000, type: "new_tiered" },
    "과장": { base: 2800000, target: 6000000, threshold: 6000000, type: "new_tiered" }
  },
  "재물심사": {
    "사원": { base: 2300000, target: 5100000, threshold: 5100000, type: "new_tiered" },
    "주임": { base: 2400000, target: 5400000, threshold: 5400000, type: "new_tiered" },
    "대리": { base: 2600000, target: 5700000, threshold: 5700000, type: "new_tiered" },
    "과장": { base: 2800000, target: 6000000, threshold: 6000000, type: "new_tiered" }
  }
};
