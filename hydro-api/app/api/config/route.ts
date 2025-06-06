import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';
import { API_CONFIGS, APIEndpoint } from '@/lib/api-config';

export async function GET() {
  try {
    const smartStats = await SmartDataService.getSmartDataStats();
    const stats = {
      totalStations: smartStats?.totalStations || 0,
      freshData: smartStats?.freshData || 0,
      staleData: smartStats?.staleData || 0,
      fromHydro: smartStats?.fromHydro || 0,
      fromHydro2: smartStats?.fromHydro2 || 0,
      withCoordinates: smartStats?.withCoordinates || 0,
      cacheEnabled: true
    };
    
    return NextResponse.json({
      success: true,
      data: {
        currentEndpoint: 'smart-cache', // Nowy system używa inteligentnego cache
        availableEndpoints: ['smart-cache'],
        endpointConfigs: {
          'smart-cache': {
            name: 'Smart Cache System',
            description: 'Inteligentny system cache łączący dane z hydro i hydro2',
            url: 'internal-cache'
          }
        },
        stats
      }
    });
  } catch (error) {
    console.error('Error getting API config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get API configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;
    
    // Nowy system używa tylko smart-cache
    if (endpoint !== 'smart-cache') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only smart-cache endpoint is available in the new system'
        },
        { status: 400 }
      );
    }
    
    // Pobierz aktualne statystyki z nowego systemu
    const smartStats = await SmartDataService.getSmartDataStats();
    const stats = {
      totalStations: smartStats?.totalStations || 0,
      freshData: smartStats?.freshData || 0,
      staleData: smartStats?.staleData || 0,
      fromHydro: smartStats?.fromHydro || 0,
      fromHydro2: smartStats?.fromHydro2 || 0,
      withCoordinates: smartStats?.withCoordinates || 0,
      cacheEnabled: true
    };
    
    return NextResponse.json({
      success: true,
      message: `Smart cache system is active`,
      data: {
        currentEndpoint: 'smart-cache',
        stats
      }
    });
  } catch (error) {
    console.error('Error getting smart cache config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get smart cache configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'compare') {
      // Porównaj dane z nowego systemu cache
      const smartStats = await SmartDataService.getSmartDataStats();
      
      return NextResponse.json({
        success: true,
        data: {
          comparison: {
            message: 'Smart cache system automatically combines data from both endpoints',
            totalStations: smartStats?.totalStations || 0,
            fromHydro: smartStats?.fromHydro || 0,
            fromHydro2: smartStats?.fromHydro2 || 0,
            freshData: smartStats?.freshData || 0,
            staleData: smartStats?.staleData || 0
          },
          summary: {
            hydro: {
              count: smartStats?.fromHydro || 0,
              description: 'Stations with data from hydro endpoint'
            },
            hydro2: {
              count: smartStats?.fromHydro2 || 0,
              description: 'Stations with data from hydro2 endpoint'
            },
            total: smartStats?.totalStations || 0
          }
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing config action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
} 