"use client";

import { useState, useEffect } from "react";
import MarketCalendar from "@/components/MarketCalendar";
import MobileMarketView from "@/components/MobileMarketView";
import DatePickerWheel from "@/components/DatePickerWheel";
import { RefreshCw, Globe, Filter } from "lucide-react";
import { Holiday, MarketSession, MarketOverrides } from "@/lib/types";

export default function Home() {
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("업데이트 중...");
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [sessions, setSessions] = useState<MarketSession[]>([]);
  const [overrides, setOverrides] = useState<MarketOverrides>({});
  const [jumpDate, setJumpDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  // Country filter states
  const ALL_COUNTRIES = [
    { id: "US", name: "🇺🇸 미국" },
    { id: "KR", name: "🇰🇷 한국" },
    { id: "JP", name: "🇯🇵 일본" },
    { id: "CN", name: "🇨🇳 중국" },
    { id: "UK", name: "🇬🇧 영국" }
  ];
  const [selectedCountries, setSelectedCountries] = useState<string[]>(ALL_COUNTRIES.map(c => c.id));

  const timezones = [
    { value: "Asia/Seoul", label: "서울 (KST)" },
    { value: "America/New_York", label: "뉴욕 (EST/EDT)" },
    { value: "Europe/London", label: "런던 (GMT/BST)" },
    { value: "Asia/Tokyo", label: "도쿄 (JST)" },
    { value: "Asia/Shanghai", label: "상하이 (CST)" },
    { value: "UTC", label: "세계 표준시 (UTC)" }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/market-data");
      const result = await res.json();
      if (result.success) {
        setHolidays(result.data.holidays);
        setSessions(result.data.sessions);
        setOverrides(result.data.overrides || {});
        setLastUpdated(new Date().toLocaleString("ko-KR"));
      }
    } catch (err) {
      console.error("Failed to fetch market data", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  // 모바일 감지 (768px 미만)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // SSR 또는 초기 렌더 시 빈 화면 방지
  if (isMobile === null) {
    return <div className="h-screen bg-slate-50" />;
  }



  return isMobile ? (
    <MobileMarketView
      timezone={timezone}
      setTimezone={setTimezone}
      selectedCountries={selectedCountries}
      setSelectedCountries={setSelectedCountries}
      holidays={holidays}
      sessions={sessions}
      overrides={overrides}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      timezones={timezones}
      allCountries={ALL_COUNTRIES}
    />
  ) : (
    <div className={`bg-slate-50 text-slate-800 p-4 md:p-8 font-sans flex flex-col items-center ${
      fitToScreen ? "h-screen overflow-hidden" : "min-h-screen"
    }`}>
      <div className={`w-full max-w-[1800px] flex flex-col gap-6 ${fitToScreen ? "h-full" : ""}`}>
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              글로벌 증시 캘린더
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              마지막 데이터 업데이트: {lastUpdated}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {/* Timezone Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 border border-slate-200">
              <Globe className="w-4 h-4 text-slate-500 mr-2" />
              <select 
                value={timezone} 
                onChange={(e) => setTimezone(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none cursor-pointer"
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? '동기화 중...' : '최신화'}
            </button>
          </div>
        </div>

        {/* Filters and Legend Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 relative z-50">
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Country Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400 mr-1" />
            <button
              onClick={() => {
                if (selectedCountries.length === ALL_COUNTRIES.length) {
                  setSelectedCountries([]);
                } else {
                  setSelectedCountries(ALL_COUNTRIES.map(c => c.id));
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCountries.length === ALL_COUNTRIES.length
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {ALL_COUNTRIES.map(c => {
              const isActive = selectedCountries.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCountries(prev => {
                      const newSelected = prev.includes(c.id)
                        ? prev.filter(id => id !== c.id)
                        : [...prev, c.id];
                      // 항상 ALL_COUNTRIES의 순서(미국-한국-일본-중국-영국)를 유지하도록 정렬
                      return newSelected.sort((a, b) => {
                        return ALL_COUNTRIES.findIndex(x => x.id === a) - ALL_COUNTRIES.findIndex(x => x.id === b);
                      });
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive 
                    ? "bg-slate-800 text-white shadow-sm" 
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
            </div>

            {/* DatePicker Toggle Button */}
            <div className="relative">
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                  showDatePicker 
                    ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                📅 날짜 텔레포트
              </button>
              
              {/* DatePicker Popover */}
              {showDatePicker && (
                <div className="absolute top-full mt-2 left-0 md:left-auto md:right-0 z-50 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <DatePickerWheel 
                    onDateSelect={(date) => { 
                      setJumpDate(date); 
                      setShowDatePicker(false); 
                    }} 
                  />
                </div>
              )}
            </div>

            {/* Layout Toggle Button */}
            <button 
              onClick={() => setFitToScreen(!fitToScreen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm"
              title="캘린더 크기를 모니터 화면에 맞추거나 스크롤 모드로 전환합니다"
            >
              {fitToScreen ? "↕️ 스크롤 뷰" : "🗖 화면 꽉 채우기"}
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-sm font-medium text-slate-600 flex-wrap">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>정규장</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-500"></span>프리마켓/NXT/데이마켓</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>애프터마켓</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>점심시간</div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className={`bg-white border border-slate-200 rounded-xl shadow-sm p-4 relative z-0 mt-4 flex flex-col ${
          fitToScreen 
            ? "flex-1 min-h-0" 
            : "w-full h-[75vh] min-h-[650px]"
        }`}>
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative min-h-0">
            <MarketCalendar 
              timezone={timezone} 
              jumpDate={jumpDate} 
              selectedCountries={selectedCountries}
              holidays={holidays}
              sessions={sessions}
              overrides={overrides}
            />
          </div>
        </div>
      </div>
    </div>
   );
}
