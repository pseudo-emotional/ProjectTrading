import { Holiday } from "./mockData";
import { addDays, startOfDay, format, isWeekend } from "date-fns";
import { toDate } from "date-fns-tz";
import { getSessionsForDate } from "./marketRules";

export function generateEvents(
  startDate: Date, 
  endDate: Date, 
  displayTimezone: string,
  selectedCountries: string[],
  holidays: Holiday[],
  viewType: string = "resourceTimeGridWeek"
) {
  const events = [];
  const isMonthView = viewType === "dayGridMonth";
  
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

    // 2. 그날(Trading Date)의 DST 상태를 반영한 국가별 세션 템플릿(오프셋 포함)을 가져옴
    const dailySessions = getSessionsForDate(currentTradingDate);
    const addedCountriesForMonth = new Set<string>();

    for (const session of dailySessions) {
      if (!selectedCountries.includes(session.country)) {
        continue;
      }

      // 3. 공휴일 체크: "해당 영업일(Trading Date)"이 공휴일인지 체크 (달력에 그려질 날짜가 아님)
      const isHoliday = holidays.some(h => h.date === dateStr && h.country === session.country);
      if (isHoliday) continue;

      // 월간 뷰(Month View)일 경우, 국가별로 하루에 딱 1개의 요약 이벤트(allDay)만 생성하여 세로 길이를 압축
      if (isMonthView) {
        if (addedCountriesForMonth.has(session.country)) continue;
        addedCountriesForMonth.add(session.country);
        
        events.push({
          id: `${session.country}_month_${dateStr}`,
          title: `${session.countryName} - 거래가능`,
          start: dateStr, // allDay event
          allDay: true,
          backgroundColor: "#0ea5e9", // Sky blue for compact look
          borderColor: "#0ea5e9",
          extendedProps: {
            country: session.country,
            countryName: session.countryName,
            type: "거래가능",
            isMonthView: true
          }
        });
        continue;
      }

      // 4. 주간/일간 뷰(TimeGrid): 오프셋 계산하여 분 단위 세션 블록 생성
      const actualStartDate = addDays(currentTradingDate, session.startDayOffset);
      const actualEndDate = addDays(currentTradingDate, session.endDayOffset);
      
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

      // 고정된 국가별 순서를 지정하여 항상 같은 열에 배치되도록 함
      const countryOrderMap: Record<string, number> = {
        "US": 1,
        "KR": 2,
        "JP": 3,
        "CN": 4,
        "UK": 5
      };

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

    currentTradingDate = addDays(currentTradingDate, 1);
  }
  
  return events;
}
