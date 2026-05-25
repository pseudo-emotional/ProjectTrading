export interface MarketSession {
  id: string;
  country: string;
  countryName: string;
  type: string;
  startTimeLocal: string;
  endTimeLocal: string;
  timezone: string;
  startDayOffset?: number;
  endDayOffset?: number;
  earlyCloseTimeLocal?: string;
  earlyStartTimeLocal?: string;
  _comment?: string;
}

export interface Holiday {
  date: string;
  country: string;
  name: string;
  isHalfDay?: boolean;
}

export interface SessionOverride {
  startTimeLocal?: string;
  endTimeLocal?: string;
  startDayOffset?: number;
  endDayOffset?: number;
  disabled?: boolean;
}

export interface DayOverride {
  reason?: string;
  [sessionId: string]: string | SessionOverride | undefined;
}

export interface CountryOverrides {
  session_overrides?: Record<string, DayOverride>;
  ats_day_market_holidays?: string[];
}

export type MarketOverrides = Record<string, CountryOverrides>;

export interface ProcessedSession {
  id: string;
  type: string;
  country: string;
  countryName: string;
  timezone: string;
  startTimeLocal: string;
  endTimeLocal: string;
  startDayOffset: number;
  endDayOffset: number;
  isAbnormal: boolean;
}

export interface CountryDailyData {
  country: string;
  dateStr: string;
  status: "개장" | "휴장" | "조기폐장" | "지연개장";
  reason: string;
  sessions: ProcessedSession[];
}
