"use client";

import React, { useRef, useEffect, useState } from 'react';
import { getDaysInMonth } from 'date-fns';

interface WheelProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: string;
}

const WheelColumn = ({ items, selectedIndex, onChange, width = "w-16" }: WheelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 40; // 40px
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 외부에서 selectedIndex가 변경되었을 때 초기 위치 설정 (사용자 스크롤 중이 아닐 때만)
    if (scrollRef.current && !isScrolling) {
      scrollRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex, isScrolling]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolling(true);
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);
    
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
      const safeIndex = Math.max(0, Math.min(items.length - 1, index));
      if (safeIndex !== selectedIndex) {
         onChange(safeIndex);
      }
      // Snap to perfectly center
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: safeIndex * ITEM_HEIGHT, behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className={`${width} h-[120px] overflow-y-auto snap-y snap-mandatory bg-slate-50 border-x border-slate-100 first:border-l-0 last:border-r-0 relative hide-scrollbar`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="h-[40px]"></div> {/* Top Padding */}
      {items.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div 
            key={idx} 
            className={`h-[40px] flex items-center justify-center snap-center text-sm transition-all duration-200 cursor-pointer select-none ${
              isSelected ? "text-indigo-600 font-bold text-base" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
              }
            }}
          >
            {item}
          </div>
        );
      })}
      <div className="h-[40px]"></div> {/* Bottom Padding */}
    </div>
  );
};

export default function DatePickerWheel({ onDateSelect }: { onDateSelect: (dateStr: string) => void }) {
  const today = new Date();
  
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());

  const years = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020 ~ 2030
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 달이 변경되어 현재 선택된 일이 존재하지 않는 경우 보정 (예: 1월 31일 -> 2월 선택 시 28일로 변경)
  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [daysInMonth, day]);

  const handleApply = () => {
    const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(formatted);
  };

  return (
    <div className="flex flex-col items-center bg-white border border-slate-200 rounded-xl shadow-sm p-4 w-fit">
      <div className="text-sm text-slate-700 font-bold mb-3 tracking-tight">
        📅 지정 날짜로 텔레포트
      </div>
      
      {/* Selection Highlight Bar (Background) */}
      <div className="relative flex rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
        <div className="absolute top-[40px] left-0 right-0 h-[40px] bg-indigo-500/10 border-y border-indigo-500/20 pointer-events-none z-10"></div>
        
        <WheelColumn 
          items={years.map(y => `${y}년`)} 
          selectedIndex={years.indexOf(year)} 
          onChange={(idx) => setYear(years[idx])} 
          width="w-20"
        />
        <WheelColumn 
          items={months.map(m => `${m}월`)} 
          selectedIndex={months.indexOf(month)} 
          onChange={(idx) => setMonth(months[idx])} 
          width="w-16"
        />
        <WheelColumn 
          items={days.map(d => `${d}일`)} 
          selectedIndex={days.indexOf(day)} 
          onChange={(idx) => setDay(days[idx])} 
          width="w-16"
        />
      </div>

      <button 
        onClick={handleApply}
        className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm"
      >
        이동하기
      </button>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
