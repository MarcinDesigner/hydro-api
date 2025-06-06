import axios from 'axios';
import { getAPIConfig, normalizeStationData, APIConfig, APIEndpoint } from './api-config';
import { CoordinatesCache, StationCoordinates } from './coordinates-cache';
import { HydroLevelsService } from './hydro-levels';

interface EnhancedStationData {
  id: string;
  name: string;
  waterLevel: number | null;
  waterLevelDate: string;
  flow?: number | null;
  flowDate?: string | null;
  river?: string | null;
  voivodeship?: string | null;
  longitude: number | null;  // Zawsze z cache lub hydro2
  latitude: number | null;   // Zawsze z cache lub hydro2
  icePhenom?: string | null;
  icePhenomDate?: string | null;
  overgrowthPhenom?: string | null;
  overgrowthPhenomDate?: string | null;
  waterTemp?: number | null;
  waterTempDate?: string | null;
  source: string;
  coordinatesSource: 'cache' | 'hydro2' | 'none';
  timestamp: string;
  // Poziomy alarmowe
  warningLevel?: number | 'nie określono';
  alarmLevel?: number | 'nie określono';
  alarmStatus?: 'normal' | 'warning' | 'alarm' | 'unknown';
  alarmMessage?: string;
}

export class EnhancedIMGWService {
  private static config: APIConfig = getAPIConfig();
  private static coordinatesInitialized = false;

  // Inicjalizuj cache współrzędnych (wywołaj raz na start aplikacji)
  static async initializeCoordinatesCache(): Promise<void> {
    if (this.coordinatesInitialized) return;

    try {
      console.log('Initializing coordinates cache...');
      
      // Pobierz dane z hydro2 do zainicjowania cache
      const hydro2Data = await this.fetchHydro2Data();
      await CoordinatesCache.initializeFromHydro2(hydro2Data);
      
      this.coordinatesInitialized = true;
      console.log('Coordinates cache initialized successfully');
    } catch (error) {
      console.error('Error initializing coordinates cache:', error);
    }
  }

  // Wymuś odświeżenie cache współrzędnych (wywołaj gdy chcesz zaktualizować)
  static async refreshCoordinatesCache(): Promise<void> {
    try {
      console.log('Refreshing coordinates cache...');
      
      const hydro2Data = await this.fetchHydro2Data();
      await CoordinatesCache.refreshAllCoordinates(hydro2Data);
      
      console.log('Coordinates cache refreshed successfully');
    } catch (error) {
      console.error('Error refreshing coordinates cache:', error);
    }
  }

  // Pobierz dane z hydro2 (do współrzędnych)
  private static async fetchHydro2Data(): Promise<any[]> {
    try {
      const response = await axios.get('https://danepubliczne.imgw.pl/api/data/hydro2', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Hydro-API/2.0'
        }
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching hydro2 data:', error);
      return [];
    }
  }

  // Pobierz dane z aktualnego endpointu
  private static async fetchCurrentAPIData(): Promise<any[]> {
    try {
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL) {
        console.log('Skipping API call during build');
        return [];
      }
      
      const response = await axios.get(this.config.baseUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Hydro-API/2.0',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Fetched ${response.data?.length || 0} stations from ${this.config.endpoint} endpoint`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching data from ${this.config.endpoint}:`, error);
      return [];
    }
  }

  // Główna metoda - pobierz wszystkie stacje z współrzędnymi z cache
  static async getAllStationsWithCoordinates(): Promise<EnhancedStationData[]> {
    try {
      // Upewnij się, że cache jest zainicjalizowany
      if (!this.coordinatesInitialized) {
        await this.initializeCoordinatesCache();
      }

      // Pobierz aktualne dane pomiarowe
      const rawData = await this.fetchCurrentAPIData();
      
      const stations: EnhancedStationData[] = [];

      for (const item of rawData) {
        const stationId = item[this.config.fieldMapping.stationId];
        if (!stationId || stationId.trim() === '') continue;

        // Normalizuj dane podstawowe
        const normalizedData = normalizeStationData(item, this.config);
        
        // Pobierz współrzędne z cache
        const cachedCoordinates = await CoordinatesCache.getCoordinates(stationId);
        
        // Pobierz poziomy alarmowe i status
        const alarmData = HydroLevelsService.getAlarmStatus(stationId, normalizedData.waterLevel);
        
        const enhancedStation: EnhancedStationData = {
          ...normalizedData,
          longitude: cachedCoordinates?.longitude || normalizedData.longitude,
          latitude: cachedCoordinates?.latitude || normalizedData.latitude,
          coordinatesSource: cachedCoordinates ? 'cache' : 
                           (normalizedData.longitude && normalizedData.latitude ? 'hydro2' : 'none'),
          // Dodaj dane alarmowe
          warningLevel: alarmData.warningLevel,
          alarmLevel: alarmData.alarmLevel,
          alarmStatus: alarmData.status,
          alarmMessage: alarmData.message
        };

        stations.push(enhancedStation);
      }

      console.log(`Returned ${stations.length} stations with coordinates`);
      return stations;
    } catch (error) {
      console.error('Error getting stations with coordinates:', error);
      return [];
    }
  }

  // Pobierz tylko stacje z współrzędnymi (do mapy)
  static async getStationsForMap(): Promise<EnhancedStationData[]> {
    const allStations = await this.getAllStationsWithCoordinates();
    return allStations.filter(station => 
      station.longitude !== null && 
      station.latitude !== null &&
      !isNaN(station.longitude) &&
      !isNaN(station.latitude)
    );
  }

  // Pobierz stację po ID z współrzędnymi
  static async getStationByIdWithCoordinates(stationId: string): Promise<EnhancedStationData | null> {
    try {
      const allStations = await this.getAllStationsWithCoordinates();
      return allStations.find(station => station.id === stationId) || null;
    } catch (error) {
      console.error('Error getting station by ID:', error);
      return null;
    }
  }

  // Statystyki cache współrzędnych
  static async getCoordinatesStats() {
    try {
      const allCoordinates = await CoordinatesCache.getAllCoordinates();
      const allStations = await this.getAllStationsWithCoordinates();
      
      return {
        totalCoordinatesInCache: allCoordinates.length,
        totalActiveStations: allStations.length,
        stationsWithCoordinates: allStations.filter(s => s.longitude && s.latitude).length,
        stationsFromCache: allStations.filter(s => s.coordinatesSource === 'cache').length,
        stationsFromHydro2: allStations.filter(s => s.coordinatesSource === 'hydro2').length,
        stationsWithoutCoordinates: allStations.filter(s => s.coordinatesSource === 'none').length,
        coveragePercentage: Math.round(
          (allStations.filter(s => s.longitude && s.latitude).length / allStations.length) * 100
        )
      };
    } catch (error) {
      console.error('Error getting coordinates stats:', error);
      return null;
    }
  }

  // Zmień endpoint API (dane pomiarowe)
  static setAPIEndpoint(endpoint: APIEndpoint) {
    process.env.IMGW_API_ENDPOINT = endpoint;
    this.config = getAPIConfig();
    console.log(`IMGW API endpoint switched to: ${endpoint}`);
  }

  // Pobierz aktualny endpoint
  static getCurrentEndpoint(): APIEndpoint {
    return this.config.endpoint;
  }
} 