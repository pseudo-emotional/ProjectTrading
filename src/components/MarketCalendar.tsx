"use client";

import React, { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import momentTimezonePlugin from "@fullcalendar/moment-timezone";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import { formatInTimeZone } from "date-fns-tz";
import { generateEvents } from "../lib/eventGenerator";
import { Holiday } from "../lib/mockData";
import { format, isWeekend } from "date-fns";
import { getSessionsForDate } from "../lib/marketRules";

interface MarketCalendarProps {
  timezone: string;
  selectedCountries: string[];
  holidays: Holiday[];
  jumpDate?: string | null;
  isMobileTimeline?: boolean;
}

export default function MarketCalendar({ timezone, selectedCountries, holidays, jumpDate, isMobileTimeline = false }: MarketCalendarProps) {
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

  const handleDatesSet = (dateInfo: any) => {
    const viewType = dateInfo.view.type;
    const generated = generateEvents(dateInfo.start, dateInfo.end, timezone, selectedCountries, holidays, viewType);
    setEvents(generated);

    // FullCalendar 내부 렌더링 후 타이틀 DOM을 조작하여 주차 버튼 주입
    setTimeout(() => {
      const titleEl = document.querySelector('.fc-toolbar-title');
      if (titleEl) {
        const existingBtn = titleEl.querySelector('.custom-week-btn');
        if (existingBtn) existingBtn.remove();

        if (viewType === 'resourceTimeGridDay') {
          const weekNum = format(dateInfo.view.currentStart, "w");
          
          titleEl.classList.add('relative'); // 날짜 텍스트를 정중앙에 고정하기 위해 relative 부여

          const btn = document.createElement('span');
          btn.className = "custom-week-btn absolute top-1/2 -translate-y-1/2 left-[calc(100%+12px)] px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 text-sm rounded-full font-extrabold cursor-pointer hover:bg-indigo-100 transition-colors shadow-sm whitespace-nowrap";
          btn.innerText = `W${weekNum}`;
          btn.title = "이 주차의 주간(Week) 화면으로 이동";
          btn.onclick = () => {
            if (calendarRef.current) {
              calendarRef.current.getApi().changeView('resourceTimeGridWeek', dateInfo.view.currentStart);
            }
          };
          
          titleEl.appendChild(btn);
        }
      }
    }, 10);

    // 2. 타이틀 클릭 시 Month 뷰로 이동하는 편의성 기능 (navLinks 미지원 영역)
    setTimeout(() => {
      const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
      if (titleEl) {
        titleEl.style.cursor = 'pointer';
        titleEl.style.textDecoration = 'underline';
        titleEl.style.textDecorationColor = '#cbd5e1';
        titleEl.title = '월간 달력으로 이동';
        titleEl.onclick = () => {
          const api = calendarRef.current?.getApi();
          if (api && api.view.type !== 'dayGridMonth') {
            api.changeView('dayGridMonth');
          }
        };
      }
    }, 10);
  };

  useEffect(() => {
    if (!calendarRef.current) return;
    const api = calendarRef.current.getApi();
    const currentView = api.view;
    const start = currentView.activeStart;
    const end = currentView.activeEnd;
    const viewType = currentView.type; // 현재 뷰 타입 가져오기
    
    const generated = generateEvents(start, end, timezone, selectedCountries, holidays, viewType);
    setEvents(generated);
  }, [timezone, selectedCountries, holidays]);

  // Jump to specific date when jumpDate prop changes
  useEffect(() => {
    if (jumpDate && calendarRef.current) {
      const api = calendarRef.current.getApi();
      setTimeout(() => {
        api.gotoDate(jumpDate);
      }, 0);
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
    const dateStr = format(arg.date, "yyyy-MM-dd");
    let openCount = 0;
    let closedCount = 0;
    
    selectedCountries.forEach(countryId => {
      const isHoliday = holidays.some(h => h.date === dateStr && h.country === countryId);
      const isWknd = isWeekend(arg.date);
      if (isWknd) closedCount++;
      else if (isHoliday) closedCount++;
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
            className={`holiday-badge-btn mt-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors no-underline hover:no-underline ${
              isWknd 
                ? "bg-slate-50 text-slate-400 cursor-default" 
                : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
            }`}
          >
            <span className={openCount > 0 ? "text-emerald-600" : ""}>개장 {openCount}</span>
            <span className="mx-1 text-slate-300">|</span>
            <span className={closedCount > 0 ? "text-rose-500" : ""}>휴장 {closedCount}</span>
          </button>
        )}
      </div>
    );
  };

  const renderDayCellContent = (arg: any) => {
    if (arg.view.type !== 'dayGridMonth') return arg.dayNumberText;

    const dateStr = format(arg.date, "yyyy-MM-dd");
    let openCount = 0;
    let closedCount = 0;
    selectedCountries.forEach(countryId => {
      const isHoliday = holidays.some(h => h.date === dateStr && h.country === countryId);
      const isWknd = isWeekend(arg.date);
      if (isWknd) closedCount++;
      else if (isHoliday) closedCount++;
      else openCount++;
    });

    const isWknd = isWeekend(arg.date);

    return (
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-1">
          {selectedCountries.length > 0 && (
            <div 
              className={`flex gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded cursor-pointer ${
                isWknd ? "bg-slate-50 text-slate-400" : "bg-slate-100 hover:bg-slate-200"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isWknd) setHolidayPopover({ date: dateStr, x: e.clientX, y: e.clientY });
              }}
              title="휴장일 상세 보기"
            >
              <span className={openCount > 0 ? "text-emerald-600" : "text-slate-400"}>장{openCount}</span>
              <span className="text-slate-300">|</span>
              <span className={closedCount > 0 ? "text-rose-500" : "text-slate-400"}>휴{closedCount}</span>
            </div>
          )}
        </div>
        <span className={`text-sm font-medium ${isWknd ? 'text-slate-400' : 'text-slate-700'}`}>
          {arg.dayNumberText}
        </span>
      </div>
    );
  };

  const renderResourceLabelContent = (arg: any) => {
    const countryName = arg.resource.title;
    const countryId = arg.resource.id;

    // 일간(Day) 뷰에서는 리소스(국가) 아래에 해당 일자의 개장/휴장 여부를 표시
    if (arg.view.type === 'resourceTimeGridDay') {
      const dateStr = format(arg.view.currentStart, "yyyy-MM-dd");
      const isHol = holidays.some(h => h.date === dateStr && h.country === countryId);
      const isWknd = isWeekend(arg.view.currentStart);
      const isClosed = isWknd || isHol;
      
      return (
        <div className="flex flex-col items-center justify-center py-1">
          <span className="font-bold text-slate-700">{countryName}</span>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (!isWknd) setHolidayPopover({ date: dateStr, x: e.clientX, y: e.clientY });
            }}
            className={`mt-1 text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
            isClosed 
              ? "bg-rose-50 text-rose-500 cursor-pointer hover:bg-rose-100" 
              : "bg-emerald-50 text-emerald-600 cursor-default"
          }`}>
            {isClosed ? "휴장" : "개장"}
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

    return (
      <div className="w-full h-full flex flex-col items-center justify-start overflow-hidden px-0.5 pt-0.5">
        <div className="font-extrabold text-[0.7rem] leading-tight text-white/95 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
          {countryName}
        </div>
        <div className="text-[0.6rem] font-medium opacity-90 leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center mt-0.5 tracking-tight">
          {shortType}
        </div>
        {isDayView && (
          <div className="text-[0.55rem] font-mono text-emerald-100 mt-1 tracking-tighter leading-none whitespace-nowrap bg-black/20 px-1 py-0.5 rounded-sm">
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
    const isWknd = isWeekend(new Date(holidayPopover.date));
    const dailySessions = getSessionsForDate(new Date(holidayPopover.date));
    
    const contentList = selectedCountries.map(country => {
      const countrySession = dailySessions.find(s => s.country === country);
      const countryName = countrySession?.countryName || country;
      const holiday = holidays.find(h => h.date === holidayPopover.date && h.country === country);
      
      let status = "개장";
      let reason = "";
      if (isWknd) {
        status = "휴장";
        reason = "주말";
      } else if (holiday) {
        status = "휴장";
        reason = holiday.name;
      } else if (!countrySession) {
        status = "휴장";
        reason = "세션 없음";
      }

      return (
        <div key={country} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
          <span className="font-semibold text-slate-700">{countryName}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${status === "개장" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
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
    <div className="w-full h-full bg-white text-slate-900 rounded-xl shadow-lg p-4 overflow-hidden relative">
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
        initialView={isMobileTimeline ? "resourceTimeGridDay" : "resourceTimeGridWeek"}
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
