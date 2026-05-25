/**
 * 2026~2027 최종 마켓 데이터 검증 리포트 생성기
 * 
 * 무료 API 기본 데이터 + market-overrides.json이 합쳐진
 * 최종 처리 결과를 JSON + 읽기 쉬운 테이블로 출력합니다.
 */

const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'src/config');

// 1. 원본 데이터 로드
const sessions = JSON.parse(fs.readFileSync(path.join(configDir, 'custom-sessions.json'), 'utf8'));
const holidays2026 = JSON.parse(fs.readFileSync(path.join(configDir, 'holidays-2026.json'), 'utf8'));
const holidays2027 = JSON.parse(fs.readFileSync(path.join(configDir, 'holidays-2027.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(configDir, 'market-overrides.json'), 'utf8'));

const allHolidays = [...holidays2026, ...holidays2027];
const countries = ['US', 'KR', 'JP', 'CN', 'UK'];

// ============================================================
// PART 1: 국가별 기본 세션 시간표
// ============================================================
console.log('='.repeat(80));
console.log('📋 PART 1: 국가별 기본 세션 시간 (custom-sessions.json)');
console.log('='.repeat(80));

countries.forEach(c => {
  const countrySessions = sessions.filter(s => s.country === c);
  console.log(`\n🏳️ ${c} (${countrySessions[0]?.countryName || c})`);
  console.log('-'.repeat(60));
  countrySessions.forEach(s => {
    const offset = s.startDayOffset ? ` [전일 시작]` : '';
    const early = s.earlyCloseTimeLocal ? ` | 조기폐장시: ~${s.earlyCloseTimeLocal}` : '';
    console.log(`  ${s.id.padEnd(12)} ${s.type.padEnd(10)} ${s.startTimeLocal} ~ ${s.endTimeLocal}${offset}${early}`);
  });
});

// ============================================================
// PART 2: 연도별 휴장일 목록
// ============================================================
console.log('\n\n' + '='.repeat(80));
console.log('📋 PART 2: 연도별 휴장일 목록 (holidays-*.json)');
console.log('='.repeat(80));

[2026, 2027].forEach(year => {
  console.log(`\n📅 ${year}년`);
  console.log('-'.repeat(60));
  countries.forEach(c => {
    const countryHolidays = allHolidays
      .filter(h => h.country === c && h.date.startsWith(String(year)))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (countryHolidays.length === 0) return;
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    console.log(`\n  🏳️ ${c} (${countryHolidays.length}일)`);
    countryHolidays.forEach(h => {
      const d = new Date(h.date + 'T00:00:00');
      const dayName = dayNames[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const weekendFlag = isWeekend ? ' ⚠️ 주말' : '';
      console.log(`    ${h.date} (${dayName}) ${h.name}${weekendFlag}`);
    });
  });
});

// ============================================================
// PART 3: Override 적용 세션 (조기폐장/지연개장/비활성화)
// ============================================================
console.log('\n\n' + '='.repeat(80));
console.log('📋 PART 3: 세션 오버라이드 (market-overrides.json) - 최종 처리 결과');
console.log('='.repeat(80));

countries.forEach(c => {
  const countryOv = overrides[c];
  if (!countryOv) return;
  
  const sessionOvs = countryOv.session_overrides || {};
  const dates = Object.keys(sessionOvs).sort();
  
  if (dates.length === 0 && !countryOv.ats_day_market_holidays?.length) return;
  
  console.log(`\n🏳️ ${c}`);
  console.log('-'.repeat(70));
  
  dates.forEach(date => {
    const dayOv = sessionOvs[date];
    console.log(`\n  📅 ${date} | 사유: ${dayOv.reason || '없음'}`);
    
    // 해당 국가의 기본 세션 목록
    const countrySessions = sessions.filter(s => s.country === c);
    
    countrySessions.forEach(s => {
      const ov = dayOv[s.id];
      if (!ov || typeof ov === 'string') return;
      
      if (ov.disabled) {
        console.log(`    ${s.id.padEnd(12)} ❌ 비활성화 (기본: ${s.startTimeLocal} ~ ${s.endTimeLocal})`);
      } else {
        const finalStart = ov.startTimeLocal || s.startTimeLocal;
        const finalEnd = ov.endTimeLocal || s.endTimeLocal;
        const changed = [];
        if (ov.startTimeLocal && ov.startTimeLocal !== s.startTimeLocal) changed.push(`시작 ${s.startTimeLocal}→${ov.startTimeLocal}`);
        if (ov.endTimeLocal && ov.endTimeLocal !== s.endTimeLocal) changed.push(`종료 ${s.endTimeLocal}→${ov.endTimeLocal}`);
        console.log(`    ${s.id.padEnd(12)} ${finalStart} ~ ${finalEnd}  (${changed.join(', ') || '변경없음'})`);
      }
    });
  });
  
  // ATS 데이마켓 휴일
  if (countryOv.ats_day_market_holidays?.length) {
    console.log(`\n  📌 ATS 데이마켓 휴장일 (${countryOv.ats_day_market_holidays.length}일):`);
    countryOv.ats_day_market_holidays.forEach(d => {
      console.log(`    ${d}`);
    });
  }
});

// ============================================================
// PART 4: 최종 머지된 JSON 파일 출력
// ============================================================
const finalReport = {
  generatedAt: new Date().toISOString(),
  description: "무료 API 기본 데이터 + market-overrides.json이 합쳐진 최종 처리 결과",
  defaultSessions: {},
  holidays: { "2026": {}, "2027": {} },
  overrides: overrides
};

countries.forEach(c => {
  finalReport.defaultSessions[c] = sessions
    .filter(s => s.country === c)
    .map(s => ({
      id: s.id,
      type: s.type,
      start: s.startTimeLocal,
      end: s.endTimeLocal,
      timezone: s.timezone,
      ...(s.startDayOffset ? { startDayOffset: s.startDayOffset } : {}),
      ...(s.earlyCloseTimeLocal ? { earlyClose: s.earlyCloseTimeLocal } : {}),
      ...(s.earlyStartTimeLocal ? { earlyStart: s.earlyStartTimeLocal } : {})
    }));
  
  [2026, 2027].forEach(year => {
    if (!finalReport.holidays[year][c]) finalReport.holidays[year][c] = [];
    finalReport.holidays[year][c] = allHolidays
      .filter(h => h.country === c && h.date.startsWith(String(year)))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(h => ({ date: h.date, name: h.name }));
  });
});

const outputPath = path.join(__dirname, '..', 'market-data-final-report.json');
fs.writeFileSync(outputPath, JSON.stringify(finalReport, null, 2), 'utf8');

console.log('\n\n' + '='.repeat(80));
console.log(`✅ 최종 머지 JSON 리포트가 생성되었습니다: ${outputPath}`);
console.log('='.repeat(80));
