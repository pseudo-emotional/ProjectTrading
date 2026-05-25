import { format, isWeekend, subDays } from "date-fns";
import { getTimezoneOffset } from "date-fns-tz";
import { MarketSession, Holiday, MarketOverrides, CountryDailyData, SessionOverride } from "./types";


export function getDailyMarketData(
  date: Date | string,
  countryId: string,
  rawSessions: MarketSession[],
  rawHolidays: Holiday[],
  rawOverrides: MarketOverrides
): CountryDailyData {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  const dateStr = format(d, "yyyy-MM-dd");
  const isWknd = isWeekend(d);
  
  const countrySessions = rawSessions.filter(s => s.country === countryId);
  const holiday = rawHolidays.find(h => h.date === dateStr && h.country === countryId);
  const countryOverrides = rawOverrides?.[countryId] || {};
  const sessionOverrides = countryOverrides.session_overrides?.[dateStr] || {};
  
  let dstStatus: "start" | "end" | undefined = undefined;
  if (countrySessions.length > 0) {
    const tz = countrySessions[0].timezone;
    if (tz) {
      // UTC 12시 기준으로 오프셋 계산 (자정 경계 시간차 이슈 회피)
      const noonToday = new Date(`${dateStr}T12:00:00Z`);
      const noonYesterday = subDays(noonToday, 1);
      const offsetToday = getTimezoneOffset(tz, noonToday);
      const offsetYesterday = getTimezoneOffset(tz, noonYesterday);

      if (offsetToday !== offsetYesterday) {
        if (offsetToday > offsetYesterday) {
          dstStatus = "start";
        } else {
          dstStatus = "end";
        }
      }
    }
  }

  const result: CountryDailyData = {
    country: countryId,
    dateStr,
    status: "개장",
    reason: "",
    sessions: [],
    ...(dstStatus ? { dstStatus } : {})
  };

  if (isWknd) {
    result.status = "휴장";
    result.reason = "주말";
    return result;
  }
  
  if (holiday && !holiday.isHalfDay) {
    result.status = "휴장";
    result.reason = holiday.name;
    return result;
  }

  let hasEarlyClose = false;
  let hasLateOpen = false;

  for (const s of countrySessions) {
    if (s.type.includes("데이마켓") && countryOverrides.ats_day_market_holidays?.includes(dateStr)) {
      continue; // Skip day market on specific holidays
    }

    const ov = (sessionOverrides[s.id] || {}) as SessionOverride;
    
    // 수능일 등 특정일에 세션이 비활성화된 경우 스킵
    if (ov.disabled) {
      continue;
    }
    
    let fallbackStart = s.startTimeLocal;
    let fallbackEnd = s.endTimeLocal;
    if (holiday && holiday.isHalfDay && !ov.startTimeLocal && !ov.endTimeLocal) {
       if (s.earlyStartTimeLocal) fallbackStart = s.earlyStartTimeLocal;
       if (s.earlyCloseTimeLocal) fallbackEnd = s.earlyCloseTimeLocal;
    }

    const startTimeLocal = ov.startTimeLocal || fallbackStart;
    const endTimeLocal = ov.endTimeLocal || fallbackEnd;
    
    const startDayOffset = ov.startDayOffset !== undefined ? ov.startDayOffset : (s.startDayOffset || 0);
    const endDayOffset = ov.endDayOffset !== undefined ? ov.endDayOffset : (s.endDayOffset || 0);

    const isAbnormal = startTimeLocal !== s.startTimeLocal || endTimeLocal !== s.endTimeLocal;

    if (s.type.includes("정규장")) {
      if (endTimeLocal < s.endTimeLocal) hasEarlyClose = true;
      if (startTimeLocal > s.startTimeLocal) hasLateOpen = true;
    }

    result.sessions.push({
      id: s.id,
      type: s.type,
      country: s.country,
      countryName: s.countryName,
      timezone: s.timezone,
      startTimeLocal,
      endTimeLocal,
      startDayOffset,
      endDayOffset,
      isAbnormal
    });
  }

  if (hasEarlyClose) {
    result.status = "조기폐장";
  } else if (hasLateOpen) {
    result.status = "지연개장";
  } else if (holiday && holiday.isHalfDay) {
    result.status = "조기폐장";
  }

  if (holiday) {
    result.reason = holiday.name;
  } else if (result.status !== "개장") {
    result.reason = countryOverrides.session_overrides?.[dateStr]?.reason || "단축 운영";
  }

  return result;
}
