import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const configDir = path.join(process.cwd(), 'src/config');
    
    // 1. 커스텀 세션 오버라이드 읽기
    const sessionsPath = path.join(configDir, 'custom-sessions.json');
    const sessionsData = JSON.parse(await fs.promises.readFile(sessionsPath, 'utf8'));

    // 2. 다중 년도(2026, 2027 등) 공식 휴장일 레지스트리 동적 병합 읽기
    const files = await fs.promises.readdir(configDir);
    const holidayFiles = files.filter(f => f.startsWith('holidays-') && f.endsWith('.json'));
    
    let holidaysData: any[] = [];
    for (const file of holidayFiles) {
      const filePath = path.join(configDir, file);
      const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
      holidaysData = holidaysData.concat(data);
    }

    // 3. 글로벌 마켓 오버라이드 (조기폐장, 지연개장, ATS 휴일 등) 읽기
    const overridesPath = path.join(configDir, 'market-overrides.json');
    const overridesData = JSON.parse(await fs.promises.readFile(overridesPath, 'utf8'));

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsData,
        holidays: holidaysData,
        overrides: overridesData
      }
    });
  } catch (error) {
    console.error("Failed to load market data:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
