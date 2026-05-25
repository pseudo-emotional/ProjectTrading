import { addDays, startOfDay, format, isWeekend } from "date-fns";
import { toDate } from "date-fns-tz";
import { getDailyMarketData } from "./marketDataProcessor";
import { MarketSession, Holiday, MarketOverrides } from "./types";
import { createMarketDataCache } from "./marketDataCache";

const countryOrderMap: Record<string, number> = {
  "US": 1,
  "KR": 2,
  "JP": 3,
  "CN": 4,
  "UK": 5
};

export function generateEvents(
  startDate: Date, 
  endDate: Date, 
  displayTimezone: string,
  selectedCountries: string[],
  holidays: Holiday[],
  sessions: MarketSession[],
  overrides: MarketOverrides = {},
  viewType: string = "resourceTimeGridWeek"
) {
  const events = [];
  const isMonthView = viewType === "dayGridMonth";
  const getCachedData = createMarketDataCache(sessions, holidays, overrides);

  
  // 중요: 금요일 영업일의 꼬리(토요일 애프터마켓)가 토요일 달력에 표시될 수 있도록,
  // 영업일 탐색은 화면에 보이는 첫 날짜보다 하루 앞(-1일)에서 시작해야 합니다.
  let currentTradingDate = addDays(startOfDay(startDate), -1);
  
  while (currentTradingDate <= endDate) {
    // dateStr은 "해당 세션이 종속된 원래 영업일(Trading Date)"을 의미합니다.
    const dateStr = format(currentTradingDate, "yyyy-MM-dd");
    
    // 1. 주말 체크: 해당 영업일(Trading Date)이 주말이면 그날 출발하는 세트를 통째로 렌더링 스킵
    if (isWeekend(currentTradingDate)) {
      currentTradingDate = addDays(currentTradingDate, 1);
      continue;
    }

    // 2. 외부 API에서 받아온 세션 목록(sessions)을 기반으로 순회합니다.
    // 기존 하드코딩된 DST 함수 대신 date-fns-tz가 타임존 변환을 자동 처리합니다.
    const addedCountriesForMonth = new Set<string>();
    for (const countryId of selectedCountries) {
      const dailyData = getCachedData(currentTradingDate, countryId);

      // 완전 휴장이면 스킵 (주말이거나 공휴일)
      if (dailyData.status === "휴장") continue;

      // 월간 뷰일 경우 국가별로 1개 이벤트만 생성
      if (isMonthView) {
        if (!addedCountriesForMonth.has(countryId)) {
          addedCountriesForMonth.add(countryId);
          events.push({
            id: `${countryId}_month_${dateStr}`,
            title: `${dailyData.sessions[0]?.countryName || countryId} - 거래가능`,
            start: dateStr, // allDay event
            allDay: true,
            backgroundColor: "#0ea5e9", // Sky blue for compact look
            borderColor: "#0ea5e9",
            extendedProps: {
              country: countryId,
              countryName: dailyData.sessions[0]?.countryName || countryId,
              type: "거래가능",
              isMonthView: true
            }
          });
        }
        continue;
      }

      for (const session of dailyData.sessions) {

        const startOffset = session.startDayOffset;
        const endOffset = session.endDayOffset;
        
        let actualStartDate = addDays(currentTradingDate, startOffset);
        let actualEndDate = addDays(currentTradingDate, endOffset);
        
        if (session.endTimeLocal < session.startTimeLocal && endOffset === 0 && startOffset === 0) {
          actualEndDate = addDays(currentTradingDate, 1);
        }
        
        const actualStartDateStr = format(actualStartDate, "yyyy-MM-dd");
        const actualEndDateStr = format(actualEndDate, "yyyy-MM-dd");

        const localStartStr = `${actualStartDateStr} ${session.startTimeLocal}`;
        const localEndStr = `${actualEndDateStr} ${session.endTimeLocal}`;
      
      let startDateZoned = toDate(localStartStr, { timeZone: session.timezone });
      let endDateZoned = toDate(localEndStr, { timeZone: session.timezone });
      
      let color = "#10b981"; // 정규장 - green
      if (session.type.includes("프리마켓") || session.type.includes("NXT") || session.type.includes("주문취소") || session.type.includes("데이마켓")) color = "#6b7280"; // gray
      else if (session.type.includes("애프터마켓")) color = "#3b82f6"; // blue
      else if (session.type.includes("점심")) color = "#f59e0b"; // yellow

      events.push({
        id: `${session.id}_${dateStr}`, // dateStr is the base Trading Date
        resourceId: session.country,
        title: `${session.countryName} ${session.type}`,
        start: startDateZoned.toISOString(),
        end: endDateZoned.toISOString(),
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          country: session.country,
          countryName: session.countryName,
          type: session.type,
          order: countryOrderMap[session.country] || 99
        }
      });
    }
    }

    currentTradingDate = addDays(currentTradingDate, 1);
  }
  
  return events;
}
