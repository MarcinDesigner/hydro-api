// lib/imgw-service.ts
import axios from 'axios';
import { getAPIConfig, normalizeStationData, APIConfig, APIEndpoint } from './api-config';

export interface IMGWHydroResponse {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  województwo: string;
  stan_wody: string;
  stan_wody_data_pomiaru: string;
  temperatura_wody?: string;
  temperatura_wody_data_pomiaru?: string;
  zjawisko_lodowe?: string;
  zjawisko_lodowe_data_pomiaru?: string;
  zjawisko_zarastania?: string;
  zjawisko_zarastania_data_pomiaru?: string;
}

export interface IMGWHydro2Response {
  kod_stacji: string;
  nazwa_stacji: string;
  lon: string;
  lat: string;
  stan: string;
  stan_data: string;
  przelyw?: string;
  przeplyw_data?: string;
}

export interface NormalizedStationData {
  id: string;
  name: string;
  waterLevel: number | null;
  waterLevelDate: string;
  flow?: number | null;
  flowDate?: string | null;
  river?: string | null;
  voivodeship?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  icePhenom?: string | null;
  icePhenomDate?: string | null;
  overgrowthPhenom?: string | null;
  overgrowthPhenomDate?: string | null;
  waterTemp?: number | null;
  waterTempDate?: string | null;
  source: string;
  timestamp: string;
}

export class IMGWService {
  private static config: APIConfig = getAPIConfig();
  
  static setAPIEndpoint(endpoint: APIEndpoint) {
    process.env.IMGW_API_ENDPOINT = endpoint;
    this.config = getAPIConfig();
    console.log(`IMGW API endpoint switched to: ${endpoint}`);
  }
  
  static getCurrentEndpoint(): APIEndpoint {
    return this.config.endpoint;
  }
  
  static async fetchCurrentAPIData(): Promise<any[]> {
    try {
      // Unikaj połączeń z API podczas build
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

  static async fetchHydroData(): Promise<IMGWHydroResponse[]> {
    try {
      const response = await axios.get('https://danepubliczne.imgw.pl/api/data/hydro', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Hydro-API/2.0'
        }
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching hydro data:', error);
      return [];
    }
  }

  static async fetchHydro2Data(): Promise<IMGWHydro2Response[]> {
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

  static async getAllStations(): Promise<NormalizedStationData[]> {
    try {
      const rawData = await this.fetchCurrentAPIData();
      
      return rawData
        .filter(item => {
          const stationId = item[this.config.fieldMapping.stationId];
          return stationId && stationId.trim() !== '';
        })
        .map(item => normalizeStationData(item, this.config));
        
    } catch (error) {
      console.error('Error getting all stations:', error);
      return [];
    }
  }

  static async getStationById(stationId: string): Promise<NormalizedStationData | null> {
    try {
      const allStations = await this.getAllStations();
      return allStations.find(station => station.id === stationId) || null;
    } catch (error) {
      console.error('Error getting station by ID:', error);
      return null;
    }
  }

  // Metoda do pobierania danych z obu endpointów (dla porównania)
  static async getAllStationsFromBothAPIs(): Promise<{
    hydro: NormalizedStationData[];
    hydro2: NormalizedStationData[];
    combined: NormalizedStationData[];
  }> {
    try {
      const [hydroData, hydro2Data] = await Promise.all([
        this.fetchHydroData(),
        this.fetchHydro2Data()
      ]);

      const hydroNormalized = hydroData.map(item => 
        normalizeStationData(item, { 
          endpoint: 'hydro', 
          baseUrl: 'https://danepubliczne.imgw.pl/api/data/hydro',
          fieldMapping: {
            stationId: 'id_stacji',
            stationName: 'stacja',
            waterLevel: 'stan_wody',
            waterLevelDate: 'stan_wody_data_pomiaru',
            river: 'rzeka',
            voivodeship: 'województwo',
            icePhenom: 'zjawisko_lodowe',
            icePhenomDate: 'zjawisko_lodowe_data_pomiaru',
            overgrowthPhenom: 'zjawisko_zarastania',
            overgrowthPhenomDate: 'zjawisko_zarastania_data_pomiaru',
            waterTemp: 'temperatura_wody',
            waterTempDate: 'temperatura_wody_data_pomiaru'
          }
        })
      );

      const hydro2Normalized = hydro2Data.map(item => 
        normalizeStationData(item, {
          endpoint: 'hydro2',
          baseUrl: 'https://danepubliczne.imgw.pl/api/data/hydro2',
          fieldMapping: {
            stationId: 'kod_stacji',
            stationName: 'nazwa_stacji',
            waterLevel: 'stan',
            waterLevelDate: 'stan_data',
            flow: 'przelyw',
            flowDate: 'przeplyw_data',
            longitude: 'lon',
            latitude: 'lat'
          }
        })
      );

      // Kombinuj dane - priorytet dla hydro2 jeśli stacja istnieje w obu
      const combinedMap = new Map<string, NormalizedStationData>();
      
      hydroNormalized.forEach(station => {
        combinedMap.set(station.id, station);
      });
      
      hydro2Normalized.forEach(station => {
        const existing = combinedMap.get(station.id);
        if (existing) {
          // Połącz dane z obu źródeł
          combinedMap.set(station.id, {
            ...existing,
            ...station,
            // Zachowaj dane z hydro jeśli hydro2 nie ma
            river: station.river || existing.river,
            voivodeship: station.voivodeship || existing.voivodeship,
            source: 'combined'
          });
        } else {
          combinedMap.set(station.id, station);
        }
      });

      return {
        hydro: hydroNormalized,
        hydro2: hydro2Normalized,
        combined: Array.from(combinedMap.values())
      };
    } catch (error) {
      console.error('Error getting stations from both APIs:', error);
      return { hydro: [], hydro2: [], combined: [] };
    }
  }

  static async getAPIStats() {
    try {
      const data = await this.getAllStationsFromBothAPIs();
      
      return {
        currentEndpoint: this.config.endpoint,
        currentEndpointCount: (await this.getAllStations()).length,
        hydro: {
          count: data.hydro.length,
          hasCoordinates: data.hydro.filter(s => s.longitude && s.latitude).length,
          hasFlow: data.hydro.filter(s => s.flow !== null).length,
          hasRiver: data.hydro.filter(s => s.river).length
        },
        hydro2: {
          count: data.hydro2.length,
          hasCoordinates: data.hydro2.filter(s => s.longitude && s.latitude).length,
          hasFlow: data.hydro2.filter(s => s.flow !== null).length,
          hasRiver: data.hydro2.filter(s => s.river).length
        },
        combined: {
          count: data.combined.length,
          hasCoordinates: data.combined.filter(s => s.longitude && s.latitude).length,
          hasFlow: data.combined.filter(s => s.flow !== null).length,
          hasRiver: data.combined.filter(s => s.river).length
        }
      };
    } catch (error) {
      console.error('Error getting API stats:', error);
      return null;
    }
  }
} 