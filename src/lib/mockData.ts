export interface MarketSession {
  id: string;
  country: string;
  countryName: string; // 한글 국가명
  type: "프리마켓" | "정규장" | "애프터마켓" | "NXT" | "점심시간";
  startTimeLocal: string; // e.g. "04:00"
  endTimeLocal: string;   // e.g. "09:30"
  timezone: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  country: string;
  name: string;
}

export const marketSessions: MarketSession[] = [
  // 미국 (EST/EDT) - America/New_York
  { id: "us_pre", country: "US", countryName: "미국", type: "프리마켓", startTimeLocal: "04:00", endTimeLocal: "09:30", timezone: "America/New_York" },
  { id: "us_reg", country: "US", countryName: "미국", type: "정규장", startTimeLocal: "09:30", endTimeLocal: "16:00", timezone: "America/New_York" },
  { id: "us_after", country: "US", countryName: "미국", type: "애프터마켓", startTimeLocal: "16:00", endTimeLocal: "20:00", timezone: "America/New_York" },
  
  // 한국 (KST) - Asia/Seoul
  { id: "kr_pre", country: "KR", countryName: "한국", type: "프리마켓", startTimeLocal: "08:30", endTimeLocal: "09:00", timezone: "Asia/Seoul" }, // 장전 시간외
  { id: "kr_reg", country: "KR", countryName: "한국", type: "정규장", startTimeLocal: "09:00", endTimeLocal: "15:30", timezone: "Asia/Seoul" },
  { id: "kr_after", country: "KR", countryName: "한국", type: "애프터마켓", startTimeLocal: "15:30", endTimeLocal: "18:00", timezone: "Asia/Seoul" }, // 장후 시간외/단일가
  
  // 일본 (JST) - Asia/Tokyo
  { id: "jp_reg_1", country: "JP", countryName: "일본", type: "정규장", startTimeLocal: "09:00", endTimeLocal: "11:30", timezone: "Asia/Tokyo" },
  { id: "jp_lunch", country: "JP", countryName: "일본", type: "점심시간", startTimeLocal: "11:30", endTimeLocal: "12:30", timezone: "Asia/Tokyo" },
  { id: "jp_reg_2", country: "JP", countryName: "일본", type: "정규장", startTimeLocal: "12:30", endTimeLocal: "15:00", timezone: "Asia/Tokyo" },
  
  // 중국 (CST) - Asia/Shanghai
  { id: "cn_reg_1", country: "CN", countryName: "중국", type: "정규장", startTimeLocal: "09:30", endTimeLocal: "11:30", timezone: "Asia/Shanghai" },
  { id: "cn_lunch", country: "CN", countryName: "중국", type: "점심시간", startTimeLocal: "11:30", endTimeLocal: "13:00", timezone: "Asia/Shanghai" },
  { id: "cn_reg_2", country: "CN", countryName: "중국", type: "정규장", startTimeLocal: "13:00", endTimeLocal: "15:00", timezone: "Asia/Shanghai" },
  
  // 영국 (GMT/BST) - Europe/London
  { id: "uk_reg", country: "UK", countryName: "영국", type: "정규장", startTimeLocal: "08:00", endTimeLocal: "16:30", timezone: "Europe/London" },
];

export const mockHolidays: Holiday[] = [
  { date: "2026-05-01", name: "노동절", country: "KR" },
  { date: "2026-05-05", name: "어린이날", country: "KR" },
  { date: "2026-05-06", name: "부처님오신날", country: "KR" },
  { date: "2026-05-25", name: "Memorial Day", country: "US" },
  { date: "2026-05-03", name: "헌법기념일", country: "JP" },
  { date: "2026-05-04", name: "녹색의 날", country: "JP" },
  { date: "2026-05-05", name: "어린이날", country: "JP" },
  { date: "2026-05-06", name: "대체휴일", country: "JP" },
  { date: "2026-05-01", name: "노동절", country: "CN" },
  { date: "2026-05-04", name: "노동절 연휴", country: "CN" },
  { date: "2026-05-05", name: "노동절 연휴", country: "CN" },
  { date: "2026-05-04", name: "Early May Bank Holiday", country: "UK" },
  { date: "2026-05-25", name: "Spring Bank Holiday", country: "UK" }
];
