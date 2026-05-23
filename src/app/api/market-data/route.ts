import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const configDir = path.join(process.cwd(), 'src/config');
    
    // 1. 커스텀 세션 오버라이드 읽기
    const sessionsPath = path.join(configDir, 'custom-sessions.json');
    const sessionsData = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));

    // 2. 2026년 거래소 공식 휴장일 레지스트리 읽기
    const holidaysPath = path.join(configDir, 'holidays-2026.json');
    const holidaysData = JSON.parse(fs.readFileSync(holidaysPath, 'utf8'));

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsData,
        holidays: holidaysData
      }
    });
  } catch (error) {
    console.error("Failed to load market data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
