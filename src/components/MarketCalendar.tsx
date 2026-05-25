"use client";

import React, { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import momentTimezonePlugin from "@fullcalendar/moment-timezone";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import { addDays, subDays, startOfWeek, endOfWeek, isWeekend } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { generateEvents } from "../lib/eventGenerator";
import { createMarketDataCache } from "../lib/marketDataCache";
import { Holiday, MarketSession, MarketOverrides } from "../lib/types";
import { format } from "date-fns";

interface MarketCalendarProps {
  timezone: string;
  selectedCountries: string[];
  holidays: Holiday[];
  jumpDate?: string | null;
  isMobileTimeline?: boolean;
  sessions: MarketSession[];
  overrides?: MarketOverrides;
}

export default function MarketCalendar({ timezone, selectedCountries, holidays, jumpDate, isMobileTimeline = false, sessions, overrides }: MarketCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<any[]>([]);
  
  // 커스텀 툴팁 상태
  const [tooltip, setTooltip] = useState<{ x: number, y: number, title: string, time: string } | null>(null);
  
  // 공휴일 정보 팝오버 상태
  const [holidayPopover, setHolidayPopover] = useState<{ date: string, x: number, y: number } | null>(null);

  const countryNameMap: Record<string, string> = {
    "US": "미국", "KR": "한국", "JP": "일본", "CN": "중국", "UK": "영국"
  };

  // 1. 선택된 국가들을 바탕으로 FullCalendar Resource 배열 동적 생성
  const resources = selectedCountries.map(countryId => ({
    id: countryId,
    title: countryNameMap[countryId] || countryId
  }));

  const getCachedData = React.useMemo(() => {
    return createMarketDataCache(sessions, holidays, overrides || {});
  }, [sessions, holidays, overrides]);

  const handleDatesSet = (dateInfo: any) => {
    const viewType = dateInfo.view.type;
    const generated = generateEvents(dateInfo.start, dateInfo.end, timezone, selectedCountries, holidays, sessions, overrides, viewType);
    setEvents(generated);

    // 데스크톱 뷰일 경우 현재 달력 상태를 저장
    if (!isMobileTimeline && typeof window !== 'undefined') {
      sessionStorage.setItem("desktop_calendar_view", viewType);
      sessionStorage.setItem("desktop_calendar_date", dateInfo.view.currentStart.toISOString());
    }
  };

  useEffect(() => {
    if (!calendarRef.current) return;
    const api = calendarRef.current.getApi();
    const currentView = api.view;
    const start = new Date(api.view.currentStart);
    const end = new Date(api.view.currentEnd);
    const viewType = currentView.type; // 현재 뷰 타입 가져오기
    
    const generated = generateEvents(start, end, timezone, selectedCountries, holidays, sessions, overrides, viewType);
    setEvents(generated);
  }, [timezone, selectedCountries, holidays, sessions, overrides]);

  const [initialView] = useState(() => {
    if (typeof window !== 'undefined' && !isMobileTimeline) {
      const saved = sessionStorage.getItem("desktop_calendar_view");
      if (saved) return saved;
    }
    return isMobileTimeline ? "resourceTimeGridDay" : "resourceTimeGridWeek";
  });

  const [initialDate] = useState(() => {
    if (jumpDate) return jumpDate;
    if (typeof window !== 'undefined' && !isMobileTimeline) {
      const saved = sessionStorage.getItem("desktop_calendar_date");
      if (saved) return saved;
    }
    return new Date().toISOString();
  });

  // Jump to specific date when jumpDate prop changes dynamically
  useEffect(() => {
    if (jumpDate && calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(jumpDate);
    }
  }, [jumpDate]);



  // 커스텀 네비게이션 핸들러 (버튼 클릭 시 데이 뷰로 넘어가는 근본 문제 해결)
  const handleNavLinkDayClick = (date: Date, jsEvent: any) => {
    const target = jsEvent.target as HTMLElement;
    // 클릭된 요소가 휴일 뱃지인지 확인
    if (target.closest('.holiday-badge-btn')) {
      return; // 뱃지 클릭 시에는 아무 작업도 하지 않음 (버튼의 onClick이 모달을 띄움)
    }
    
    // 날짜 텍스트 클릭 시 데이 뷰로 강제 이동
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      setTimeout(() => {
        api.changeView('resourceTimeGridDay', date);
      }, 0);
    }
  };



  const renderDayHeader = (arg: any) => {
    // 1. Month View: 요일 이름만 출력하고 통계는 숨김
    if (arg.view.type === 'dayGridMonth') {
      return (
        <div className="py-2 text-slate-700 font-bold text-sm">
          {arg.text}
        </div>
      );
    }

    // 2. Week/Day View: 날짜 이름과 함께 개장/휴장 통계 출력
    let openCount = 0;
    let closedCount = 0;
    let earlyCount = 0;
    let lateCount = 0;
    
    const dateStr = format(arg.date, "yyyy-MM-dd");

    selectedCountries.forEach(countryId => {
      const dailyData = getCachedData(dateStr, countryId);
      const status = dailyData.status;
      if (status === "휴장") closedCount++;
      else if (status === "조기폐장") earlyCount++;
      else if (status === "지연개장") lateCount++;
      else openCount++;
    });

    const isWknd = isWeekend(arg.date);

    return (
      <div className="flex flex-col items-center justify-center py-1">
        <span className={`font-bold ${isWknd ? 'text-slate-400' : 'text-slate-700'}`}>{arg.text}</span>
        {selectedCountries.length > 0 && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isWknd) {
                setHolidayPopover({ date: dateStr, x: e.clientX, y: e.clientY });
              }
            }}
            className={`holiday-badge-btn mt-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors no-underline hover:no-underline flex items-center gap-1 ${
              isWknd 
                ? "bg-slate-50 text-slate-400 cursor-default" 
                : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
            }`}
          >
            {openCount > 0 && <span className="text-emerald-600">개장 {openCount}</span>}
            {earlyCount > 0 && <span className="text-amber-500">조기 {earlyCount}</span>}
            {lateCount > 0 && <span className="text-amber-500">지연 {lateCount}</span>}
            {closedCount > 0 && <span className="text-rose-500">휴장 {closedCount}</span>}
          </button>
        )}
      </div>
    );
  };

  const renderDayCellContent = (arg: any) => {
    if (arg.view.type !== 'dayGridMonth') return arg.dayNumberText;

    let openCount = 0;
    let closedCount = 0;
    let earlyCount = 0;
    let lateCount = 0;
    let dstBadge: "start" | "end" | null = null;
    
    const dateStr = format(arg.date, "yyyy-MM-dd");

    selectedCountries.forEach(countryId => {
      const dailyData = getCachedData(dateStr, countryId);
      const status = dailyData.status;
      if (status === "휴장") closedCount++;
      else if (status === "조기폐장") earlyCount++;
      else if (status === "지연개장") lateCount++;
      else openCount++;
      
      if (dailyData.dstStatus) {
        dstBadge = dailyData.dstStatus;
      }
    });

    const isWknd = isWeekend(arg.date);

    return (
      <div className="flex flex-col w-full h-full justify-between">
        <div className="flex items-start justify-between w-full px-1 mt-0.5">
          <div className="flex items-center gap-1">
            {selectedCountries.length > 0 && (
              <div 
                className={`holiday-badge-btn flex gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded cursor-pointer ${
                  isWknd ? "bg-slate-50 text-slate-400" : "bg-slate-100 hover:bg-slate-200"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isWknd) setHolidayPopover({ date: dateStr, x: e.clientX, y: e.clientY });
                }}
                title="휴장일 상세 보기"
              >
                <span className={openCount > 0 ? "text-emerald-600" : "text-slate-400"}>장{openCount}</span>
                {earlyCount > 0 && <span className="text-amber-500">조{earlyCount}</span>}
                {lateCount > 0 && <span className="text-amber-500">지{lateCount}</span>}
                <span className={closedCount > 0 ? "text-rose-500" : "text-slate-400"}>휴{closedCount}</span>
              </div>
            )}
          </div>
          <span className={`text-sm font-medium ${isWknd ? 'text-slate-400' : 'text-slate-700'}`}>
            {arg.dayNumberText}
          </span>
        </div>
        {dstBadge && (
          <div className="w-full flex justify-center mb-0.5">
            <span className={`text-[9px] font-extrabold px-1.5 py-[2px] rounded-sm shadow-sm ${
              dstBadge === "start" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
            }`}>
              {dstBadge === "start" ? "🌞 서머타임 시작" : "🌜 서머타임 종료"}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderResourceLabelContent = (arg: any) => {
    const countryName = arg.resource.title;
    const countryId = arg.resource.id;

    // 일간(Day) 뷰에서는 리소스(국가) 아래에 해당 일자의 개장/휴장 여부를 표시
    if (arg.view.type === 'resourceTimeGridDay') {
      const dateStr = format(arg.view.currentStart, "yyyy-MM-dd");
      const dailyData = getCachedData(dateStr, countryId);
      const { status } = dailyData;
      const isWknd = isWeekend(arg.view.currentStart);
      
      let badgeColor = "bg-emerald-50 text-emerald-600 cursor-default";
      if (status === "휴장") badgeColor = "bg-rose-50 text-rose-500 cursor-pointer hover:bg-rose-100";
      else if (status === "조기폐장" || status === "지연개장") badgeColor = "bg-amber-50 text-amber-600 cursor-pointer hover:bg-amber-100";
      
      return (
        <div className="flex flex-col items-center justify-center py-1.5">
          <span className="font-extrabold text-[15px] text-slate-700">{countryName}</span>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (!isWknd) setHolidayPopover({ date: dateStr, x: e.clientX, y: e.clientY });
            }}
            className={`mt-1 text-xs px-2.5 py-0.5 rounded-md font-semibold transition-colors ${badgeColor}`}>
            {status}
          </div>
        </div>
      );
    }
    
    // 주간(Week) 뷰 등에서는 국가명만 표시
    return (
      <div className="py-1">
        <span className="font-bold text-slate-700">{countryName}</span>
      </div>
    );
  };

  const renderEventContent = (arg: any) => {
    const { countryName, type, isMonthView } = arg.event.extendedProps;
    
    // 월간 뷰 전용 심플 렌더링
    if (isMonthView) {
      return (
        <div className="w-full text-center py-0.5 text-[10px] font-bold text-white shadow-sm overflow-hidden whitespace-nowrap px-1 rounded-sm bg-[#0ea5e9]/90 hover:bg-[#0ea5e9] transition-colors">
          {countryName} 거래가능
        </div>
      );
    }

    // 모바일 타임라인 모드: 텍스트 없이 색상 박스만
    if (isMobileTimeline) {
      return <div className="w-full h-full" title={`${countryName} ${type}`} />;
    }

    // Shorten type names for narrow columns
    let shortType = type;
    if (shortType === "NXT 메인마켓") shortType = "NXT 메인";
    else if (shortType === "NXT 프리마켓") shortType = "NXT 프리";
    else if (shortType === "NXT 애프터마켓") shortType = "NXT 애프터";
    else if (shortType === "KRX 정규장") shortType = "KRX 정규";
    else if (shortType === "정규장 (오전)") shortType = "오전장";
    else if (shortType === "정규장 (오후)") shortType = "오후장";
    else if (shortType === "휴장 (점심)") shortType = "점심";
    else if (shortType === "정규장") shortType = "정규";
    else if (shortType === "애프터마켓") shortType = "애프터";
    else if (shortType === "프리마켓") shortType = "프리";
    else if (shortType === "데이마켓") shortType = "데이";

    const isDayView = arg.view.type === 'resourceTimeGridDay';
    const durationMin = arg.event.end && arg.event.start ? (arg.event.end.getTime() - arg.event.start.getTime()) / 60000 : 120;
    const isShort = durationMin <= 75 && !shortType.includes("점심");

    if (isShort) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden px-1">
          <div className="flex flex-col items-center justify-center gap-0.5 w-full overflow-hidden">
            <span className="font-extrabold text-[0.8rem] leading-none text-white/95 whitespace-nowrap truncate">{countryName}</span>
            <span className="text-[0.75rem] font-medium opacity-90 leading-none whitespace-nowrap truncate">{shortType}</span>
          </div>
          {isDayView && (
            <div className="text-[0.65rem] font-mono text-emerald-100 mt-1 tracking-tighter leading-none whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded-sm">
              {formatInTimeZone(arg.event.start, timezone, 'HH:mm')}-{formatInTimeZone(arg.event.end, timezone, 'HH:mm')}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-start overflow-hidden px-1 pt-1">
        <div className="font-extrabold text-[0.85rem] leading-tight text-white/95 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
          {countryName}
        </div>
        <div className="text-[0.75rem] font-medium opacity-90 leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center mt-0.5 tracking-tight">
          {shortType}
        </div>
        {isDayView && (
          <div className="text-[0.65rem] font-mono text-emerald-100 mt-1 tracking-tighter leading-none whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded-sm">
            {formatInTimeZone(arg.event.start, timezone, 'HH:mm')} - {formatInTimeZone(arg.event.end, timezone, 'HH:mm')}
          </div>
        )}
      </div>
    );
  };

  const handleEventMouseEnter = (arg: any) => {
    const { countryName, type, isMonthView } = arg.event.extendedProps;
    if (isMonthView || arg.view.type === 'resourceTimeGridDay') return;

    const el = arg.el as HTMLElement;
    const rect = el.getBoundingClientRect();

    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      title: `${countryName} ${type}`,
      time: `${formatInTimeZone(arg.event.start, timezone, 'HH:mm')} - ${formatInTimeZone(arg.event.end, timezone, 'HH:mm')}`
    });
  };

  const handleEventMouseLeave = () => {
    setTooltip(null);
  };

  let popoverContent = null;
  if (holidayPopover) {
    const contentList = selectedCountries.map(country => {
      const dailyData = getCachedData(holidayPopover.date, country);
      const countrySession = sessions.find(s => s.country === country);
      const countryName = countrySession?.countryName || country;
      
      const status = dailyData.status;
      const reason = dailyData.reason || (!countrySession ? "세션 없음" : "");

      return (
        <div key={country} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
          <span className="font-semibold text-slate-700">{countryName}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded font-bold ${
              status === "개장" ? "bg-emerald-100 text-emerald-700" : 
              status === "조기폐장" || status === "지연개장" ? "bg-amber-100 text-amber-700" :
              "bg-rose-100 text-rose-700"
            }`}>
              {status}
            </span>
            {reason && <span className="text-xs text-slate-500">{reason}</span>}
          </div>
        </div>
      );
    });

    const safeLeft = Math.min(holidayPopover.x, typeof window !== 'undefined' ? window.innerWidth - 300 : 1000);
    const safeTop = Math.min(holidayPopover.y + 15, typeof window !== 'undefined' ? window.innerHeight - 350 : 800);

    popoverContent = (
      <>
        <div className="fixed inset-0 z-[9998]" onClick={() => setHolidayPopover(null)}></div>
        <div 
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ left: safeLeft, top: safeTop }}
        >
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">📅 {holidayPopover.date}</h3>
            <button onClick={() => setHolidayPopover(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-4 flex flex-col max-h-[60vh] overflow-y-auto">
            {contentList}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`w-full h-full bg-white text-slate-900 rounded-xl shadow-lg p-4 relative ${isMobileTimeline ? '' : 'overflow-hidden'}`}>
      <style>{`
        .fc-event {
          border-radius: 4px;
          opacity: 0.95;
          padding: 1px 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          text-align: center;
          font-weight: 600;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          border: none;
        }
        .fc-event-main {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
        }
      `}</style>
      
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, momentTimezonePlugin, resourceTimeGridPlugin]}
        initialView={initialView}
        initialDate={initialDate}
        resources={resources}
        datesAboveResources={true}
        headerToolbar={isMobileTimeline ? false : {
          left: "prev,next today",
          center: "title",
          right: "resourceTimeGridWeek,resourceTimeGridDay,dayGridMonth"
        }}
        events={events}
        datesSet={handleDatesSet}
        timeZone={timezone}
        height={isMobileTimeline ? "auto" : "100%"}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        allDaySlot={false}
        nowIndicator={true}
        expandRows={true}
        slotEventOverlap={false}
        dayHeaderContent={renderDayHeader}
        dayCellContent={renderDayCellContent}
        resourceLabelContent={renderResourceLabelContent}
        eventContent={renderEventContent}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        navLinks={true}
        navLinkDayClick={handleNavLinkDayClick}
        navLinkWeekClick="resourceTimeGridWeek"
        weekNumbers={true}
        stickyHeaderDates={true}
      />

      {popoverContent}

      {tooltip && (
        <div 
          className="fixed z-[9999] pointer-events-none bg-slate-800/95 backdrop-blur-sm text-white px-2 py-1 rounded shadow-md text-[10px] flex flex-col gap-0.5 transform -translate-x-1/2 -translate-y-full animate-in fade-in duration-75"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <div className="font-bold text-emerald-400 leading-none">{tooltip.title}</div>
          <div className="text-slate-200 font-mono tracking-tight leading-none">{tooltip.time}</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800/95 rotate-45"></div>
        </div>
      )}
    </div>
  );
}
