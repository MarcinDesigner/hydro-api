// app/api/station/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        status: 'error',
        message: 'Station ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Pobierz prawdziwe dane z API IMGW
    const stationData = await IMGWService.getStationById(id);

    if (!stationData) {
      return NextResponse.json({
        status: 'error',
        message: 'Station not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Przekształć dane do standardowego formatu
    const responseData = {
      id_stacji: stationData.id,
      stacja: stationData.name,
      rzeka: stationData.river,
      województwo: stationData.voivodeship,
      stan_wody: stationData.waterLevel?.toString() || null,
      stan_wody_data_pomiaru: stationData.waterLevelDate,
      przelyw: stationData.flow?.toString() || null,
      temperatura_wody: stationData.waterTemp?.toString() || null,
      source: stationData.source,
      longitude: stationData.longitude,
      latitude: stationData.latitude,
      poziom_ostrzegawczy: null, // Brak w API IMGW
      poziom_alarmowy: null,     // Brak w API IMGW
      trend: 'stable' as const,  // Wymagałoby porównania z poprzednimi danymi
      zmiana_poziomu: '0'        // Wymagałoby porównania z poprzednimi danymi
    };

    return NextResponse.json({
      status: 'success',
      data: {
        station: responseData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in station API:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}