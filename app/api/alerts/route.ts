// app/api/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';

export async function GET() {
  try {
    // Pobierz inteligentne dane ze wszystkich stacji (najświeższe z obu endpointów)
    const stations = await SmartDataService.getSmartStationsData();
    
    // Generuj alerty na podstawie rzeczywistych poziomów alarmowych
    const alerts = stations
      .filter(station => 
        station.alarmStatus === 'warning' || station.alarmStatus === 'alarm'
      )
      .map((station, index) => ({
        id: `alert_${station.id}_${Date.now()}_${index}`,
        station: {
          id: station.id,
          name: station.name,
          river: station.river || 'Nieznana rzeka',
          voivodeship: station.voivodeship || 'Nieznane województwo'
        },
        alertType: station.alarmStatus === 'alarm' ? 'alarm' : 'warning',
        message: station.alarmMessage || `${station.alarmStatus === 'alarm' ? 'Alarm' : 'Ostrzeżenie'}: ${station.waterLevel}cm`,
        waterLevel: station.waterLevel || 0,
        thresholdLevel: station.alarmStatus === 'alarm' 
          ? (typeof station.alarmLevel === 'number' ? station.alarmLevel : 0)
          : (typeof station.warningLevel === 'number' ? station.warningLevel : 0),
        warningLevel: station.warningLevel,
        alarmLevel: station.alarmLevel,
        coordinates: {
          longitude: station.longitude,
          latitude: station.latitude,
          source: station.coordinatesSource
        },
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