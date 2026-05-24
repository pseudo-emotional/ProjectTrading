"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  format, isWeekend,
  startOfWeek, endOfWeek, eachDayOfInterval,
  startOfMonth, endOfMonth,
  addDays, subDays, addMonths, subMonths,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getSessionsForDate } from "../lib/marketRules";
import { Holiday } from "../lib/mockData";
import MarketCalendar from "./MarketCalendar";

// 색상 체계 (데스크톱 동일)
const SESSION_COLORS: Record<string, string> = {
  "정규장": "#10b981", "KRX 정규장": "#10b981",
  "정규장 (오전)": "#10b981", "정규장 (오후)": "#10b981",
  "프리마켓": "#6b7280", "NXT 프리마켓": "#6b7280",
  "NXT 메인마켓": "#6b7280", "데이마켓": "#6b7280",
  "애프터마켓": "#3b82f6", "NXT 애프터마켓": "#3b82f6",
  "휴장 (점심)": "#f59e0b",
};

const FLAGS: Record<string, string> = { US: "🇺🇸", KR: "🇰🇷", JP: "🇯🇵", CN: "🇨🇳", UK: "🇬🇧" };
const NAMES: Record<string, string> = { US: "미국", KR: "한국", JP: "일본", CN: "중국", UK: "영국" };
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  timezone: string;
  setTimezone: (tz: string) => void;
  selectedCountries: string[];
  setSelectedCountries: React.Dispatch<React.SetStateAction<string[]>>;
  holidays: Holiday[];
  onRefresh: () => void;
  isRefreshing: boolean;
  timezones: { value: string; label: string }[];
  allCountries: { id: string; name: string }[];
}

export default function MobileMarketView({
  timezone, setTimezone,
  selectedCountries, setSelectedCountries,
  holidays, onRefresh, isRefreshing,
  timezones, allCountries,
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [dayViewMode, setDayViewMode] = useState<"card" | "timeline">("card");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [holidayPopover, setHolidayPopover] = useState<string | null>(null); // yyyy-MM-dd or null
  const [teleportDate, setTeleportDate] = useState<string>("");

  const closeMoreMenu = () => {
    setShowMoreMenu(false);
    setTeleportDate("");
  };

  const isTimeline = viewMode === "day" && dayViewMode === "timeline";

  // ── 스크롤 감지로 헤더 숨김 처리 ──
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!isTimeline) {
      setIsHeaderVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      
      if (currentScrollY < 50) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 5) {
        setIsHeaderVisible(false); // 스크롤 내리면 숨김
      } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 5) {
        setIsHeaderVisible(true);  // 스크롤 올리면 보임
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isTimeline]);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ──── 유틸 ────
  const fmtTime = (kst: string, date: Date, offset: number) => {
    const [h, m] = kst.split(":").map(Number);
    const d = new Date(date); d.setDate(d.getDate() + offset);
    return formatInTimeZone(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h - 9, m)), timezone, "HH:mm");
  };

  const isClosed = (cid: string, date: Date) => {
    if (isWeekend(date)) return true;
    return holidays.some(h => h.date === format(date, "yyyy-MM-dd") && h.country === cid);
  };

  const getHolName = (cid: string, date: Date) => {
    const h = holidays.find(x => x.date === format(date, "yyyy-MM-dd") && x.country === cid);
    return h?.name || null;
  };



  // ──── 네비 ────
  const goNext = () => {
    if (viewMode === "day") setCurrentDate(p => addDays(p, 1));
    else if (viewMode === "week") setCurrentDate(p => addDays(p, 7));
    else setCurrentDate(p => addMonths(p, 1));
  };
  const goBack = () => {
    if (viewMode === "day") setCurrentDate(p => subDays(p, 1));
    else if (viewMode === "week") setCurrentDate(p => subDays(p, 7));
    else setCurrentDate(p => subMonths(p, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const getTitle = () => {
    if (viewMode === "day") return `${format(currentDate, "M/d")} (${DAY_NAMES[currentDate.getDay()]})`;
    if (viewMode === "week") return `W${format(currentDate, "w")}`;
    return format(currentDate, "yyyy년 M월");
  };

  let isViewingCurrent = false;
  let moveText = "";
  const now = new Date();
  if (viewMode === "day") {
    isViewingCurrent = format(currentDate, "yyyy-MM-dd") === todayStr;
    moveText = "오늘로 이동 →";
  } else if (viewMode === "week") {
    const wk1 = startOfWeek(currentDate, { weekStartsOn: 1 });
    const wk2 = startOfWeek(now, { weekStartsOn: 1 });
    isViewingCurrent = format(wk1, "yyyy-MM-dd") === format(wk2, "yyyy-MM-dd");
    moveText = "이번주로 이동 →";
  } else {
    isViewingCurrent = format(currentDate, "yyyy-MM") === format(now, "yyyy-MM");
    moveText = "이번달로 이동 →";
  }

  // 데이 뷰 헤더용: 선택된 국가 중 휴장인 곳이 있는지
  const hasAnyClosed = selectedCountries.some(c => isClosed(c, currentDate));

  // ════════════════════════════════════════════
  //  DAY VIEW
  // ════════════════════════════════════════════
  const renderDayView = () => {
    const sessions = getSessionsForDate(currentDate);
    const wknd = isWeekend(currentDate);
    return (
      <div className={`flex flex-col w-full ${dayViewMode === "card" ? "pb-8" : "pb-[80px]"}`}>
        {dayViewMode === "card" ? (
          <div className="flex flex-col gap-3 px-4 py-3">
            {selectedCountries.map(cid => {
              const cs = sessions.filter(s => s.country === cid);
              const closed = isClosed(cid, currentDate);
              const holName = getHolName(cid, currentDate);
              return (
                <div key={cid} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{FLAGS[cid]}</span>
                      <span className="font-bold text-slate-800 text-[15px]">{NAMES[cid]}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${closed ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {closed ? "휴장" : "개장"}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    {closed ? (
                      <div className="flex flex-col items-center justify-center py-5 text-slate-400">
                        <svg className="w-7 h-7 mb-1.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span className="text-sm font-medium">{wknd ? "주말 휴장" : holName || "휴장일"}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {cs.map(s => (
                          <div key={s.id} className="flex items-center gap-3">
                            <div className="w-1 h-9 rounded-full flex-shrink-0" style={{ backgroundColor: SESSION_COLORS[s.type] || "#6b7280" }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-slate-700 truncate">{s.type}</div>
                              <div className="text-[12px] text-slate-500 font-mono tracking-tight">
                                {fmtTime(s.startTimeLocal, currentDate, s.startDayOffset)} – {fmtTime(s.endTimeLocal, currentDate, s.endDayOffset)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full px-1 py-1">
            <MarketCalendar 
              timezone={timezone}
              selectedCountries={selectedCountries}
              holidays={holidays}
              jumpDate={format(currentDate, "yyyy-MM-dd")}
              isMobileTimeline={true}
            />
            {/* 타임라인 전용 하단 고정 범례 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-2.5 flex items-center justify-center gap-3 flex-wrap shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-40" style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />정규장</div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" />프리/NXT/데이</div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />애프터</div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />점심시간</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════
  //  WEEK VIEW (전체 국가 표시, 5개 시 두 줄)
  // ════════════════════════════════════════════
  const renderWeekView = () => {
    const wkStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: wkStart, end: wkEnd });

    return (
      <div className="flex flex-col gap-2 px-4 py-3 pb-8">
        {days.map(day => {
          const ds = format(day, "yyyy-MM-dd");
          const wknd = isWeekend(day);
          const today = ds === todayStr;

          return (
            <div
              key={ds}
              onClick={() => { setCurrentDate(day); setViewMode("day"); }}
              className={`cursor-pointer flex flex-col gap-2 px-4 py-3 rounded-xl border transition-all text-left active:scale-[0.98] ${
                today ? "border-indigo-300 bg-indigo-50/80 shadow-sm" : "border-slate-200 bg-white active:bg-slate-50"
              }`}
            >
              {/* 상단: 날짜 + 오늘 뱃지 */}
              <div className="flex items-center gap-2">
                <span className={`text-[15px] font-bold tabular-nums ${wknd ? "text-slate-400" : "text-slate-700"}`}>
                  {format(day, "M/d")}
                </span>
                <span className={`text-xs ${wknd ? "text-slate-400" : "text-slate-500"}`}>
                  ({DAY_NAMES[day.getDay()]})
                </span>
                {today && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">오늘</span>}
              </div>

              {/* 하단: 전체 국가 상태 (flex-wrap으로 두 줄 자동 배치) */}
              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                {selectedCountries.map(cid => {
                  const closed = isClosed(cid, day);
                  return (
                    <div 
                      key={cid} 
                      className="flex items-center gap-1"
                      onClick={(e) => {
                        if (closed) {
                          e.stopPropagation();
                          setHolidayPopover(format(day, "yyyy-MM-dd"));
                        }
                      }}
                    >
                      <span className="text-[13px] leading-none">{FLAGS[cid]}</span>
                      <span className={`text-[11px] font-bold ${closed ? "text-rose-500" : "text-emerald-600"}`}>
                        {closed ? "휴" : "장"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ════════════════════════════════════════════
  //  MONTH VIEW
  // ════════════════════════════════════════════
  const renderMonthView = () => {
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(mStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div className="px-4 py-3 pb-8">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map(d => <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {allDays.map(day => {
            const isCur = day.getMonth() === currentDate.getMonth();
            const wknd = isWeekend(day);
            const today = format(day, "yyyy-MM-dd") === todayStr;
            let openC = 0, closedC = 0;
            if (isCur) selectedCountries.forEach(c => { if (isClosed(c, day)) closedC++; else openC++; });

            return (
              <button
                key={format(day, "yyyy-MM-dd")}
                onClick={() => { if (isCur) { setCurrentDate(day); setViewMode("day"); } }}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs transition-all min-h-[52px] active:scale-95 ${
                  !isCur ? "opacity-25 pointer-events-none"
                  : today ? "bg-indigo-100 border-2 border-indigo-400 font-bold"
                  : "border border-transparent"
                } ${wknd && isCur ? "text-slate-400" : "text-slate-700"}`}
              >
                <span className="font-semibold text-[13px]">{format(day, "d")}</span>
                {isCur && selectedCountries.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {openC > 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">{openC}</span>}
                    {closedC > 0 && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded">{closedC}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════
  //  HOLIDAY POPOVER (바텀 시트)
  // ════════════════════════════════════════════
  const renderHolidayPopover = () => {
    if (!holidayPopover) return null;
    const popDate = new Date(holidayPopover + "T00:00:00");
    const wknd = isWeekend(popDate);

    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-[100] mobile-menu-backdrop" onClick={() => setHolidayPopover(null)} />
        <div className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-2xl shadow-2xl overflow-hidden mobile-bottom-sheet" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
          {/* 핸들 바 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-[15px]">📅 {format(popDate, "yyyy년 M월 d일")} ({DAY_NAMES[popDate.getDay()]})</h3>
            <button onClick={() => setHolidayPopover(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 국가별 상태 리스트 */}
          <div className="px-5 py-4 flex flex-col gap-3 max-h-[50vh] overflow-y-auto mobile-scroll">
            {wknd && <p className="text-xs text-amber-600 font-medium mb-1">⚠️ 이 날은 주말입니다.</p>}
            {selectedCountries.map(cid => {
              const closed = isClosed(cid, popDate);
              const holName = getHolName(cid, popDate);
              let reason = "";
              if (wknd) reason = "주말";
              else if (holName) reason = holName;

              return (
                <div key={cid} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{FLAGS[cid]}</span>
                    <span className="font-semibold text-slate-700 text-[14px]">{NAMES[cid]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${closed ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {closed ? "휴장" : "개장"}
                    </span>
                    {reason && <span className="text-[11px] text-slate-500 max-w-[100px] truncate">{reason}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  // ════════════════════════════════════════════
  //  MORE MENU
  // ════════════════════════════════════════════
  const renderMoreMenu = () => {
    if (!showMoreMenu) return null;
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] mobile-menu-backdrop" onClick={closeMoreMenu} />
        <div className="fixed top-0 right-0 h-full w-[280px] bg-white shadow-2xl z-[101] flex flex-col mobile-menu-panel">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <h2 className="font-bold text-slate-800 text-base">설정</h2>
            <button onClick={closeMoreMenu} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6 mobile-scroll">
            {/* 타임존 */}
            <section>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">🌐 타임존</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 outline-none appearance-none">
                {timezones.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </section>
            {/* 국가 필터 */}
            <section>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">🔍 국가 필터</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { selectedCountries.length === allCountries.length ? setSelectedCountries([]) : setSelectedCountries(allCountries.map(c => c.id)); }}
                  className={`px-3 py-2 rounded-full text-xs font-semibold transition-all ${selectedCountries.length === allCountries.length ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                >All</button>
                {allCountries.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCountries(prev => { const n = prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]; return n.sort((a, b) => allCountries.findIndex(x => x.id === a) - allCountries.findIndex(x => x.id === b)); }); }}
                    className={`px-3 py-2 rounded-full text-xs font-semibold transition-all ${selectedCountries.includes(c.id) ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                  >{c.name}</button>
                ))}
              </div>
            </section>
            {/* 날짜 텔레포트 */}
            <section>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">📅 날짜 텔레포트</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={teleportDate || format(currentDate, "yyyy-MM-dd")} 
                  onChange={e => setTeleportDate(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 outline-none min-w-0" 
                />
                <button 
                  onClick={() => {
                    if (teleportDate) {
                      setCurrentDate(new Date(teleportDate + "T00:00:00"));
                      setViewMode("day");
                      closeMoreMenu();
                    }
                  }}
                  disabled={!teleportDate || teleportDate === format(currentDate, "yyyy-MM-dd")}
                  className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:bg-slate-300 transition-colors whitespace-nowrap"
                >
                  이동
                </button>
              </div>
            </section>
            {/* 최신화 */}
            <section>
              <button onClick={() => { onRefresh(); closeMoreMenu(); }} disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3 rounded-xl font-semibold text-sm disabled:opacity-60">
                <svg className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {isRefreshing ? "동기화 중..." : "최신화"}
              </button>
            </section>
            {/* 범례 */}
            <section className="border-t border-slate-100 pt-5 mt-auto">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">범례</label>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />정규장</div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0" />프리/NXT/데이</div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />애프터마켓</div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />점심시간</div>
              </div>
            </section>
          </div>
        </div>
      </>
    );
  };

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 relative">
      {/* ── 스크롤 반응형 통합 헤더 ── */}
      <div 
        className={`sticky top-0 z-40 w-full flex flex-col shadow-sm transition-transform duration-300 ease-in-out ${
          isTimeline && !isHeaderVisible ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        {/* 상단 바 */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <h1 className="text-[15px] font-extrabold text-slate-800 tracking-tight">글로벌 증시 캘린더</h1>
          <button 
            onClick={() => setShowMoreMenu(true)}
            className="p-2 -mr-1 rounded-lg active:bg-slate-100" aria-label="설정"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {/* 날짜 네비게이션 + 뷰 탭 */}
        <div className="bg-white border-b border-slate-100 flex-shrink-0 px-4 py-2.5">
          <div className="grid grid-cols-[40px_1fr_40px] items-center mb-2">
            <button onClick={goBack} className="p-2 -ml-1 rounded-xl active:bg-slate-100 justify-self-start">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="flex justify-center items-center">
              <div className="relative flex items-center justify-center">
                {/* 휴장 정보 버튼 (데이 뷰에서만) - 왼쪽 절대 위치 */}
                {viewMode === "day" && (
                  <div className="absolute right-full mr-2">
                    <button
                      onClick={() => setHolidayPopover(format(currentDate, "yyyy-MM-dd"))}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                        hasAnyClosed
                          ? "bg-rose-50 border-rose-200 active:bg-rose-100"
                          : "bg-emerald-50 border-emerald-200 active:bg-emerald-100"
                      }`}
                      aria-label="휴장 정보"
                    >
                      <div className={`w-2 h-2 rounded-full ${hasAnyClosed ? "bg-rose-500" : "bg-emerald-500"}`} />
                    </button>
                  </div>
                )}

                {/* 중앙 텍스트 (기준점) */}
                <span className="font-bold text-slate-800 text-[15px]">{getTitle()}</span>

                {/* 오늘 뱃지 또는 이동 링크 - 오른쪽 절대 위치 */}
                <div className="absolute left-full ml-2 flex items-center">
                  {isViewingCurrent ? (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {viewMode === "day" ? "오늘" : viewMode === "week" ? "이번주" : "이번달"}
                    </span>
                  ) : (
                    <button onClick={goToday} className="text-[10px] text-indigo-500 font-medium active:text-indigo-700 whitespace-nowrap">
                      {moveText}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button onClick={goNext} className="p-2 -mr-1 rounded-xl active:bg-slate-100 justify-self-end">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          
          {/* 뷰 탭 */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["day", "week", "month"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                {m === "day" ? "일간" : m === "week" ? "주간" : "월간"}
              </button>
            ))}
          </div>
        </div>

        {/* 뷰 모드 토글 (데이뷰만) */}
        {viewMode === "day" && (
          <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100 bg-white/95 backdrop-blur">
            <span className="text-sm font-semibold text-slate-500">
              {dayViewMode === "card" ? "국가별 정보 (카드)" : "시간대별 표시 (타임라인)"}
            </span>
            <button 
              onClick={() => setDayViewMode(m => m === "card" ? "timeline" : "card")} 
              className="text-[11px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm font-bold active:bg-slate-50 transition-colors text-slate-600"
            >
              {dayViewMode === "card" ? "시간별로 보기 📊" : "카드뷰로 보기 📋"}
            </button>
          </div>
        )}
      </div>

      {/* ── 콘텐츠 ── */}
      {viewMode === "day" && renderDayView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "month" && renderMonthView()}

      {/* ── 팝오버/메뉴 ── */}
      {renderHolidayPopover()}
      {renderMoreMenu()}
    </div>
  );
}
