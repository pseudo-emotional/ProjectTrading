import { NextResponse } from 'next/server';

// Mock DB or initial data (fallback)
import { mockHolidays } from '@/lib/mockData';

export async function GET() {
  try {
    // [TODO] Finnhub API Integration
    // To implement the actual API, you would do something like:
    // const finnhubApiKey = process.env.FINNHUB_API_KEY;
    // const resKR = await fetch(\`https://finnhub.io/api/v1/stock/market-holiday?exchange=KS&token=\${finnhubApiKey}\`);
    // const dataKR = await resKR.json();
    // ... map data to our Holiday format.

    // For now, returning our mock data to verify the pipeline.
    // We simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json({
      success: true,
      data: mockHolidays
    });

  } catch (error) {
    console.error("Failed to fetch holidays:", error);
    return NextResponse.json({ success: false, error: "API fetch failed" }, { status: 500 });
  }
}
