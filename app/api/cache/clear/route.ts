import { NextResponse } from 'next/server';

// Symulacja cache - w rzeczywistej aplikacji to byłaby Redis lub inny cache store
let cacheStore = new Map();

export async function POST() {
  try {
    // Wyczyść cache
    cacheStore.clear();
    
    // Wyczyść cache w pamięci dla SmartDataService
    if ((global as any).smartDataCache) {
      (global as any).smartDataCache.clear();
    }
    
    // Wyczyść sessionStorage cache info
    const response = NextResponse.json({
      success: true,
      message: 'Cache został wyczyszczony',
      timestamp: new Date().toISOString()
    });
    
    // Dodaj headers żeby wymusić odświeżenie
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Błąd czyszczenia cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Błąd podczas czyszczenia cache',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Użyj POST do wyczyszczenia cache',
    cacheSize: cacheStore.size,
    timestamp: new Date().toISOString()
  });
} 