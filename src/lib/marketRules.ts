// DST 판별 유틸리티 (미국)
export function isUSDst(date: Date): boolean {
  const year = date.getFullYear();
  // 3월 두 번째 일요일 찾기
  let dstStart = new Date(year, 2, 1); // 3월 1일
  let sundayCount = 0;
  while (sundayCount < 2) {
    if (dstStart.getDay() === 0) sundayCount++;
    if (sundayCount < 2) dstStart.setDate(dstStart.getDate() + 1);
  }
  
  // 11월 첫 번째 일요일 찾기
  let dstEnd = new Date(year, 10, 1); // 11월 1일
  while (dstEnd.getDay() !== 0) {
    dstEnd.setDate(dstEnd.getDate() + 1);
  }
  
  return date >= dstStart && date < dstEnd;
}

// DST 판별 유틸리티 (영국)
export function isUKDst(date: Date): boolean {
  const year = date.getFullYear();
  // 3월 마지막 일요일 찾기
  let dstStart = new Date(year, 2, 31); // 3월 31일
  while (dstStart.getDay() !== 0) {
    dstStart.setDate(dstStart.getDate() - 1);
  }
  
  // 10월 마지막 일요일 찾기
  let dstEnd = new Date(year, 9, 31); // 10월 31일
  while (dstEnd.getDay() !== 0) {
    dstEnd.setDate(dstEnd.getDate() - 1);
  }
  
  return date >= dstStart && date < dstEnd;
}

export interface RuleSession {
  id: string;
  country: string;
  countryName: string;
  type: string;
  startDayOffset: number; // 0 for today, 1 for tomorrow
  startTimeLocal: string; // KST 기준 "HH:mm" 또는 "HH:mm:ss"
  endDayOffset: number;   // 0 for today, 1 for tomorrow
  endTimeLocal: string;   // KST 기준 "HH:mm" 또는 "HH:mm:ss"
  timezone: string;       // 기본적으로 모두 KST("Asia/Seoul")를 사용
}

// 특정 "영업일(Trading Day)"에 대한 모든 국가의 세션(KST 기준)을 반환하는 함수
export function getSessionsForDate(date: Date): RuleSession[] {
  const sessions: RuleSession[] = [];
  
  // 1. 한국 (South Korea)
  sessions.push(
    { id: "kr_nxt_pre", country: "KR", countryName: "한국", type: "NXT 프리마켓", startDayOffset: 0, startTimeLocal: "08:00", endDayOffset: 0, endTimeLocal: "08:50", timezone: "Asia/Seoul" },
    { id: "kr_reg", country: "KR", countryName: "한국", type: "KRX 정규장", startDayOffset: 0, startTimeLocal: "09:00", endDayOffset: 0, endTimeLocal: "15:30", timezone: "Asia/Seoul" },
    { id: "kr_nxt_main", country: "KR", countryName: "한국", type: "NXT 메인마켓", startDayOffset: 0, startTimeLocal: "09:00", endDayOffset: 0, endTimeLocal: "15:20", timezone: "Asia/Seoul" },
    { id: "kr_nxt_after", country: "KR", countryName: "한국", type: "NXT 애프터마켓", startDayOffset: 0, startTimeLocal: "15:40", endDayOffset: 0, endTimeLocal: "20:00", timezone: "Asia/Seoul" }
  );

  // 2. 일본 (Japan) - 2024년 11월 5일 30분 연장 반영
  sessions.push(
    { id: "jp_reg_1", country: "JP", countryName: "일본", type: "정규장 (오전)", startDayOffset: 0, startTimeLocal: "09:00", endDayOffset: 0, endTimeLocal: "11:30", timezone: "Asia/Seoul" },
    { id: "jp_lunch", country: "JP", countryName: "일본", type: "휴장 (점심)", startDayOffset: 0, startTimeLocal: "11:30", endDayOffset: 0, endTimeLocal: "12:30", timezone: "Asia/Seoul" },
    { id: "jp_reg_2", country: "JP", countryName: "일본", type: "정규장 (오후)", startDayOffset: 0, startTimeLocal: "12:30", endDayOffset: 0, endTimeLocal: "15:30", timezone: "Asia/Seoul" }
  );

  // 3. 중국 (China)
  sessions.push(
    { id: "cn_reg_1", country: "CN", countryName: "중국", type: "정규장 (오전)", startDayOffset: 0, startTimeLocal: "10:30", endDayOffset: 0, endTimeLocal: "12:30", timezone: "Asia/Seoul" },
    { id: "cn_lunch", country: "CN", countryName: "중국", type: "휴장 (점심)", startDayOffset: 0, startTimeLocal: "12:30", endDayOffset: 0, endTimeLocal: "14:00", timezone: "Asia/Seoul" },
    { id: "cn_reg_2", country: "CN", countryName: "중국", type: "정규장 (오후)", startDayOffset: 0, startTimeLocal: "14:00", endDayOffset: 0, endTimeLocal: "16:00", timezone: "Asia/Seoul" }
  );

  // 4. 미국 (United States)
  const isSummerUS = isUSDst(date);
  if (isSummerUS) {
    sessions.push(
      { id: "us_day", country: "US", countryName: "미국", type: "데이마켓", startDayOffset: 0, startTimeLocal: "09:00", endDayOffset: 0, endTimeLocal: "16:50", timezone: "Asia/Seoul" },
      { id: "us_pre", country: "US", countryName: "미국", type: "프리마켓", startDayOffset: 0, startTimeLocal: "17:00", endDayOffset: 0, endTimeLocal: "22:30", timezone: "Asia/Seoul" },
      { id: "us_reg", country: "US", countryName: "미국", type: "정규장", startDayOffset: 0, startTimeLocal: "22:30", endDayOffset: 1, endTimeLocal: "05:00", timezone: "Asia/Seoul" },
      { id: "us_after", country: "US", countryName: "미국", type: "애프터마켓", startDayOffset: 1, startTimeLocal: "05:00", endDayOffset: 1, endTimeLocal: "09:00", timezone: "Asia/Seoul" }
    );
  } else {
    sessions.push(
      { id: "us_day", country: "US", countryName: "미국", type: "데이마켓", startDayOffset: 0, startTimeLocal: "10:00", endDayOffset: 0, endTimeLocal: "17:50", timezone: "Asia/Seoul" },
      { id: "us_pre", country: "US", countryName: "미국", type: "프리마켓", startDayOffset: 0, startTimeLocal: "18:00", endDayOffset: 0, endTimeLocal: "23:30", timezone: "Asia/Seoul" },
      { id: "us_reg", country: "US", countryName: "미국", type: "정규장", startDayOffset: 0, startTimeLocal: "23:30", endDayOffset: 1, endTimeLocal: "06:00", timezone: "Asia/Seoul" },
      { id: "us_after", country: "US", countryName: "미국", type: "애프터마켓", startDayOffset: 1, startTimeLocal: "06:00", endDayOffset: 1, endTimeLocal: "10:00", timezone: "Asia/Seoul" }
    );
  }

  // 5. 영국 (United Kingdom)
  const isSummerUK = isUKDst(date);
  if (isSummerUK) {
    sessions.push(
      { id: "uk_reg", country: "UK", countryName: "영국", type: "정규장", startDayOffset: 0, startTimeLocal: "16:00", endDayOffset: 1, endTimeLocal: "00:30", timezone: "Asia/Seoul" }
    );
  } else {
    sessions.push(
      { id: "uk_reg", country: "UK", countryName: "영국", type: "정규장", startDayOffset: 0, startTimeLocal: "17:00", endDayOffset: 1, endTimeLocal: "01:30", timezone: "Asia/Seoul" }
    );
  }

  return sessions;
}
