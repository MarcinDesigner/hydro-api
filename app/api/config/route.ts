import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';
import { API_CONFIGS, APIEndpoint } from '@/lib/api-config';

export async function GET() {
  try {
    const currentEndpoint = IMGWService.getCurrentEndpoint();
    const stats = await IMGWService.getAPIStats();
    
    return NextResponse.json({
      success: true,
      data: {
        currentEndpoint,
        availableEndpoints: Object.keys(API_CONFIGS),
        endpointConfigs: API_CONFIGS,
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
    
    if (!endpoint || !API_CONFIGS[endpoint as APIEndpoint]) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid endpoint. Available endpoints: ' + Object.keys(API_CONFIGS).join(', ')
        },
        { status: 400 }
      );
    }
    
    // Aktualizuj zmienną środowiskową (tylko w runtime)
    process.env.IMGW_API_ENDPOINT = endpoint;
    
    // Ustaw nowy endpoint w serwisie
    IMGWService.setAPIEndpoint(endpoint as APIEndpoint);
    
    // Pobierz statystyki dla nowego endpointu
    const stats = await IMGWService.getAPIStats();
    
    return NextResponse.json({
      success: true,
      message: `API endpoint switched to: ${endpoint}`,
      data: {
        currentEndpoint: endpoint,
        stats
      }
    });
  } catch (error) {
    console.error('Error switching API endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to switch API endpoint' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'compare') {
      // Porównaj dane z obu endpointów
      const comparison = await IMGWService.getAllStationsFromBothAPIs();
      
      return NextResponse.json({
        success: true,
        data: {
          comparison,
          summary: {
            hydro: {
              count: comparison.hydro.length,
              uniqueStations: comparison.hydro.filter(h => 
                !comparison.hydro2.find(h2 => h2.id === h.id)
              ).length
            },
            hydro2: {
              count: comparison.hydro2.length,
              uniqueStations: comparison.hydro2.filter(h2 => 
                !comparison.hydro.find(h => h.id === h2.id)
              ).length
            },
            common: comparison.hydro.filter(h => 
              comparison.hydro2.find(h2 => h2.id === h.id)
            ).length
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