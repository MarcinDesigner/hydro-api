// app/api/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';

export async function GET() {
  try {
    // Pobierz wszystkie stacje
    const stations = await IMGWService.getAllStations();
    
    // Generuj proste alerty na podstawie poziomu wody
    const alerts = stations
      .filter(station => station.waterLevel && station.waterLevel > 300) // Przykładowy próg
      .slice(0, 10) // Ograniczenie do 10 alertów
      .map((station, index) => ({
        id: `alert_${station.id}_${Date.now()}_${index}`,
        station: {
          id: station.id,
          name: station.name,
          river: station.river || 'Nieznana rzeka',
          voivodeship: station.voivodeship || 'Nieznane województwo'
        },
        alertType: station.waterLevel && station.waterLevel > 500 ? 'critical' : 'warning',
        message: `Wysoki poziom wody: ${station.waterLevel}cm`,
        waterLevel: station.waterLevel,
        thresholdLevel: 300,
        createdAt: new Date().toISOString(),
        isActive: true
      }));

    return NextResponse.json({
      status: 'success',
      alerts: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Uproszczony endpoint do "rozwiązywania" alertów
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId } = body;
    
    if (!alertId) {
      return NextResponse.json({
        status: 'error',
        message: 'Alert ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Symulacja rozwiązania alertu
    return NextResponse.json({
      status: 'success',
      message: 'Alert resolved successfully',
      alert: {
        id: alertId,
        resolvedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}