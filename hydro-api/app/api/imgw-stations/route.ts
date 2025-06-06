import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { CoordinatesCache } from '../../../lib/coordinates-cache';

// In-memory cache
let cachedData: any = null;
let cachedQualityStats: any = null;
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut

// Interfejsy dla danych IMGW
interface HydroData {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  województwo: string;
  stan_wody: string | null;
  stan_wody_data_pomiaru: string;
  przelyw?: string | null;
  temperatura_wody?: string | null;
  temperatura_wody_data_pomiaru?: string | null;
  zjawisko_lodowe?: string | null;
  zjawisko_lodowe_data_pomiaru?: string | null;
}

interface Hydro2Data {
  kod_stacji: string;
  nazwa_stacji: string;
  rzeka?: string;
  wojewodztwo?: string;
  stan: string | null;
  stan_data: string;
  przelyw?: string | null;
  przeplyw_data?: string | null;
}

// Funkcja do pobierania danych z obu endpointów IMGW
async function fetchAllStationsData(): Promise<{ stations: any[], qualityStats: any }> {
  try {
    console.log('🌐 Pobieram dane z obu endpointów IMGW (hydro + hydro2)');
    
    // Pobierz dane z obu endpointów równolegle
    const [hydroResponse, hydro2Response] = await Promise.all([
      axios.get('https://danepubliczne.imgw.pl/api/data/hydro', {
        timeout: 15000,
        headers: { 'User-Agent': 'NextJS-App/1.0' }
      }).catch(err => {
        console.warn('Hydro endpoint failed:', err.message);
        return { data: [] };
      }),
      axios.get('https://danepubliczne.imgw.pl/api/data/hydro2', {
        timeout: 15000,
        headers: { 'User-Agent': 'NextJS-App/1.0' }
      }).catch(err => {
        console.warn('Hydro2 endpoint failed:', err.message);
        return { data: [] };
      })
    ]);

    const hydroData: HydroData[] = hydroResponse.data || [];
    const hydro2Data: Hydro2Data[] = hydro2Response.data || [];
    
    console.log(`📊 Pobrano ${hydroData.length} stacji z hydro, ${hydro2Data.length} z hydro2`);
    
    // Zainicjalizuj cache współrzędnych jeśli nie jest zainicjalizowany
    if (!CoordinatesCache.isInitialized()) {
      await CoordinatesCache.initializeFromHydro2(hydro2Data);
    }
    
    // Utwórz mapy dla szybkiego dostępu
    const hydroMap = new Map<string, HydroData>();
    const hydro2Map = new Map<string, Hydro2Data>();
    
    hydroData.forEach(item => hydroMap.set(item.id_stacji, item));
    hydro2Data.forEach(item => hydro2Map.set(item.kod_stacji, item));
    
    // Znajdź wszystkie unikalne ID stacji
    const allStationIds = new Set([
      ...hydroData.map(item => item.id_stacji),
      ...hydro2Data.map(item => item.kod_stacji)
    ]);
    
    const combinedStations: any[] = [];
    
    for (const stationId of allStationIds) {
      const hydroStation = hydroMap.get(stationId);
      const hydro2Station = hydro2Map.get(stationId);
      
      // Pobierz współrzędne z cache
      const coordinates = await CoordinatesCache.getCoordinates(stationId);
      
      // Funkcja do porównania dat i wyboru najświeższych danych
      const chooseBestData = (hydroValue: any, hydroDate: string, hydro2Value: any, hydro2Date: string) => {
        // Jeśli tylko jedna strona ma dane
        if (hydroValue && !hydro2Value) return { value: hydroValue, date: hydroDate, source: 'hydro' };
        if (!hydroValue && hydro2Value) return { value: hydro2Value, date: hydro2Date, source: 'hydro2' };
        if (!hydroValue && !hydro2Value) return { value: null, date: '', source: 'none' };
        
        // Obie strony mają dane - porównaj daty
        try {
          const hydroDateTime = new Date(hydroDate).getTime();
          const hydro2DateTime = new Date(hydro2Date).getTime();
          
          // Jeśli hydro2 ma nowsze dane (różnica > 1 godzina)
          if (hydro2DateTime - hydroDateTime > 60 * 60 * 1000) {
            return { value: hydro2Value, date: hydro2Date, source: 'hydro2' };
          }
          // W przeciwnym razie preferuj hydro (domyślnie lub jeśli daty podobne)
          return { value: hydroValue, date: hydroDate, source: 'hydro' };
        } catch (error) {
          // Jeśli błąd parsowania dat, preferuj hydro
          return { value: hydroValue, date: hydroDate, source: 'hydro' };
        }
      };
      
      // Wybierz najlepsze dane dla poziomu wody
      const bestWaterLevel = chooseBestData(
        hydroStation?.stan_wody,
        hydroStation?.stan_wody_data_pomiaru || '',
        hydro2Station?.stan,
        hydro2Station?.stan_data || ''
      );
      
      // Wybierz najlepsze dane dla przepływu
      const bestFlow = chooseBestData(
        hydroStation?.przelyw,
        hydroStation?.stan_wody_data_pomiaru || '', // hydro nie ma osobnej daty dla przepływu
        hydro2Station?.przelyw,
        hydro2Station?.przeplyw_data || ''
      );
      
      // Określ główne źródło danych dla stacji
      let primarySource = 'hydro';
      if (!hydroStation && hydro2Station) {
        primarySource = 'hydro2';
      } else if (hydroStation && hydro2Station) {
        // Jeśli oba mają dane, sprawdź które są świeższe
        try {
          const hydroDate = new Date(hydroStation.stan_wody_data_pomiaru || '1970-01-01').getTime();
          const hydro2Date = new Date(hydro2Station.stan_data || '1970-01-01').getTime();
          if (hydro2Date > hydroDate + 60 * 60 * 1000) { // hydro2 nowsze o > 1h
            primarySource = 'hydro2';
          }
        } catch (error) {
          // Błąd parsowania - zostań przy hydro
        }
      }
      
      const station = {
        id_stacji: stationId,
        stacja: hydroStation?.stacja || hydro2Station?.nazwa_stacji || '',
        rzeka: hydroStation?.rzeka || hydro2Station?.rzeka || '',
        województwo: hydroStation?.województwo || hydro2Station?.wojewodztwo || '',
        
        // Dodaj współrzędne z cache
        longitude: coordinates?.longitude || null,
        latitude: coordinates?.latitude || null,
        coordinates_source: coordinates ? 'cache' : 'none',
        
        // Inteligentny wybór najświeższych danych
        stan_wody: bestWaterLevel.value,
        stan_wody_data_pomiaru: bestWaterLevel.date,
        stan_wody_source: bestWaterLevel.source,
        
        przelyw: bestFlow.value,
        przelyw_data_pomiaru: bestFlow.date,
        przelyw_source: bestFlow.source,
        
        // Dane dostępne tylko w hydro
        temperatura_wody: hydroStation?.temperatura_wody || null,
        temperatura_wody_data_pomiaru: hydroStation?.temperatura_wody_data_pomiaru || null,
        zjawisko_lodowe: hydroStation?.zjawisko_lodowe || null,
        zjawisko_lodowe_data_pomiaru: hydroStation?.zjawisko_lodowe_data_pomiaru || null,
        
        // Metadane o źródłach
        source: primarySource,
        has_hydro_data: !!hydroStation,
        has_hydro2_data: !!hydro2Station,
        data_quality: {
          water_level_freshness: bestWaterLevel.source,
          flow_freshness: bestFlow.source,
          is_mixed_sources: bestWaterLevel.source !== bestFlow.source
        }
      };
      
      combinedStations.push(station);
    }
    
    // Oblicz statystyki jakości danych
    const qualityStats = {
      total: combinedStations.length,
      water_level_from_hydro: combinedStations.filter(s => s.stan_wody_source === 'hydro').length,
      water_level_from_hydro2: combinedStations.filter(s => s.stan_wody_source === 'hydro2').length,
      flow_from_hydro: combinedStations.filter(s => s.przelyw_source === 'hydro').length,
      flow_from_hydro2: combinedStations.filter(s => s.przelyw_source === 'hydro2').length,
      mixed_sources: combinedStations.filter(s => s.data_quality.is_mixed_sources).length,
      hydro2_preferred: combinedStations.filter(s => s.source === 'hydro2').length,
      with_coordinates: combinedStations.filter(s => s.longitude && s.latitude).length
    };
    
    console.log(`✅ Połączono dane: ${combinedStations.length} unikalnych stacji`);
    console.log(`📊 Jakość danych:`, qualityStats);
    
    return { stations: combinedStations, qualityStats };
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania danych z IMGW:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  
  // Sprawdź czy cache jest aktualny (chyba że wymuszono odświeżenie)
  if (!forceRefresh && cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    console.log('🎯 Zwracam dane z server cache');
    return NextResponse.json({
      data: cachedData,
      cached: true,
      cacheAge: Math.floor((now - cacheTime) / 1000),
      fetchTime: new Date(cacheTime).toISOString(),
      qualityStats: cachedQualityStats,
      stats: {
        total: cachedData.length,
        hydroOnly: cachedData.filter((s: any) => s.source === 'hydro').length,
        hydro2Only: cachedData.filter((s: any) => s.source === 'hydro2').length,
        combined: cachedData.filter((s: any) => s.has_hydro_data && s.has_hydro2_data).length
      }
    }, {
      headers: {
        'X-Cache-Status': 'HIT',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  }
  
  try {
    // Pobierz dane z obu endpointów IMGW
    const result = await fetchAllStationsData();
    const data = result.stations;
    
    // Zapisz do cache
    cachedData = data;
    cachedQualityStats = result.qualityStats;
    cacheTime = now;
    
    return NextResponse.json({
      data: data,
      cached: false,
      fetchTime: new Date().toISOString(),
      stats: {
        total: data.length,
        hydroOnly: data.filter(s => s.source === 'hydro').length,
        hydro2Only: data.filter(s => s.source === 'hydro2').length,
        combined: data.filter(s => s.has_hydro_data && s.has_hydro2_data).length
      },
      qualityStats: result.qualityStats
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache-Status': 'MISS'
      }
    });
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania danych:', error);
    
    // Jeśli API nie działa, zwróć cache'owane dane jeśli istnieją
    if (cachedData) {
      console.log('⚠️ API niedostępne, zwracam stale dane z cache');
      return NextResponse.json({
        data: cachedData,
        cached: true,
        error: 'API temporarily unavailable, serving cached data',
        cacheAge: Math.floor((now - (cacheTime || 0)) / 1000),
        fetchTime: cacheTime ? new Date(cacheTime).toISOString() : null,
        qualityStats: cachedQualityStats,
        stats: {
          total: cachedData.length,
          hydroOnly: cachedData.filter((s: any) => s.source === 'hydro').length,
          hydro2Only: cachedData.filter((s: any) => s.source === 'hydro2').length,
          combined: cachedData.filter((s: any) => s.has_hydro_data && s.has_hydro2_data).length
        }
      }, {
        headers: {
          'X-Cache-Status': 'STALE'
        }
      });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch data and no cached data available',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
} 