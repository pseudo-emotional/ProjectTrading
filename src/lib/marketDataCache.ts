import { format } from "date-fns";
import { getDailyMarketData } from "./marketDataProcessor";
import { MarketSession, Holiday, MarketOverrides, CountryDailyData } from "./types";

export function createMarketDataCache(
  sessions: MarketSession[],
  holidays: Holiday[],
  overrides: MarketOverrides
) {
  const cache = new Map<string, CountryDailyData>();

  return function getCachedDailyData(
    date: Date | string,
    countryId: string
  ): CountryDailyData {
    const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
    const dateStr = format(d, "yyyy-MM-dd");
    const key = `${dateStr}|${countryId}`;

    if (!cache.has(key)) {
      cache.set(key, getDailyMarketData(d, countryId, sessions, holidays, overrides));
    }
    
    return cache.get(key)!;
  };
}
