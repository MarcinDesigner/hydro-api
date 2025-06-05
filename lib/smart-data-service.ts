import axios from 'axios';
import { CoordinatesCache } from './coordinates-cache';
import { HydroLevelsService } from './hydro-levels';
import { StationVisibilityService } from './station-visibility';

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
  zjawisko_zarastania?: string | null;
  zjawisko_zarastania_data_pomiaru?: string | null;
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
  lat: number;
  lon: number;
}

interface SmartStationData {
  id: string;
  name: string;
  waterLevel: number | null;
  waterLevelDate: string;
  flow?: number | null;
  flowDate?: string | null;
  river?: string | null;
  voivodeship?: string | null;
  longitude: number | null;
  latitude: number | null;
  coordinatesSource: 'cache' | 'hydro2' | 'none';
  source: 'hydro' | 'hydro2';
  dataFreshness: 'fresh' | 'stale';
  hoursOld?: number;
  timestamp: string;
  // Poziomy alarmowe
  warningLevel?: number | 'nie określono';
  alarmLevel?: number | 'nie określono';
  alarmStatus?: 'normal' | 'warning' | 'alarm' | 'unknown';
  alarmMessage?: string;
}

export class SmartDataService {
  private static coordinatesInitialized = false;

  // Inicjalizuj cache współrzędnych
  static async initializeCoordinatesCache(): Promise<void> {
    if (this.coordinatesInitialized) return;

    try {
      console.log('Initializing coordinates cache...');
      const hydro2Data = await this.fetchHydro2Data();
      await CoordinatesCache.initializeFromHydro2(hydro2Data);
      this.coordinatesInitialized = true;
      console.log('Coordinates cache initialized successfully');
    } catch (error) {
      console.error('Error initializing coordinates cache:', error);
    }
  }

  // Pobierz dane z hydro endpoint
  private static async fetchHydroData(): Promise<HydroData[]> {
    try {
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL) {
        console.log('Skipping API call during build');
        return [];
      }

      const response = await axios.get('https://danepubliczne.imgw.pl/api/data/hydro', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Hydro-API/2.0',
          'Accept': 'application/json'
        }
      });

      console.log(`Fetched ${response.data?.length || 0} stations from hydro endpoint`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching hydro data:', error);
      return [];
    }
  }

  // Pobierz dane z hydro2 endpoint
  private static async fetchHydro2Data(): Promise<Hydro2Data[]> {
    try {
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL) {
        console.log('Skipping API call during build');
        return [];
      }

      const response = await axios.get('https://danepubliczne.imgw.pl/api/data/hydro2', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Hydro-API/2.0',
          'Accept': 'application/json'
        }
      });

      console.log(`Fetched ${response.data?.length || 0} stations from hydro2 endpoint`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching hydro2 data:', error);
      return [];
    }
  }

  // Oblicz wiek danych w godzinach
  private static calculateDataAge(dateString: string): number {
    try {
      const measurementDate = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - measurementDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60)); // godziny
    } catch (error) {
      console.error('Error calculating data age:', error);
      return 999; // bardzo stare dane jeśli błąd parsowania
    }
  }

  // Normalizuj dane z hydro endpoint
  private static normalizeHydroData(item: HydroData): Partial<SmartStationData> {
    return {
      id: item.id_stacji,
      name: item.stacja,
      waterLevel: item.stan_wody ? parseFloat(item.stan_wody) : null,
      waterLevelDate: item.stan_wody_data_pomiaru,
      flow: item.przelyw ? parseFloat(item.przelyw) : null,
      river: item.rzeka,
      voivodeship: item.województwo,
      source: 'hydro',
      timestamp: new Date().toISOString()
    };
  }

  // Normalizuj dane z hydro2 endpoint
  private static normalizeHydro2Data(item: Hydro2Data): Partial<SmartStationData> {
    return {
      id: item.kod_stacji,
      name: item.nazwa_stacji,
      waterLevel: item.stan ? parseFloat(item.stan) : null,
      waterLevelDate: item.stan_data,
      flow: item.przelyw ? parseFloat(item.przelyw) : null,
      flowDate: item.przeplyw_data || null,
      river: item.rzeka,
      voivodeship: item.wojewodztwo,
      longitude: item.lon,
      latitude: item.lat,
      source: 'hydro2',
      timestamp: new Date().toISOString()
    };
  }

  // Główna metoda - pobierz najświeższe dane dla wszystkich stacji
  static async getSmartStationsData(): Promise<SmartStationData[]> {
    try {
      // Upewnij się, że cache jest zainicjalizowany
      if (!this.coordinatesInitialized) {
        await this.initializeCoordinatesCache();
      }

      // Pobierz dane z obu endpointów
      const [hydroData, hydro2Data] = await Promise.all([
        this.fetchHydroData(),
        this.fetchHydro2Data()
      ]);

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

      const smartStations: SmartStationData[] = [];

      for (const stationId of allStationIds) {
        const hydroStation = hydroMap.get(stationId);
        const hydro2Station = hydro2Map.get(stationId);

        let selectedData: Partial<SmartStationData>;
        let dataFreshness: 'fresh' | 'stale' = 'fresh';
        let hoursOld: number | undefined;

        if (hydroStation && hydro2Station) {
          // Oba endpointy mają dane dla tej stacji
          const hydroAge = this.calculateDataAge(hydroStation.stan_wody_data_pomiaru);
          const hydro2Age = this.calculateDataAge(hydro2Station.stan_data);

          // Sprawdź czy przynajmniej jeden pomiar jest nowszy niż 24h
          if (hydroAge < 24 || hydro2Age < 24) {
            // Wybierz nowszy pomiar
            if (hydroAge <= hydro2Age) {
              selectedData = this.normalizeHydroData(hydroStation);
              hoursOld = hydroAge;
            } else {
              selectedData = this.normalizeHydro2Data(hydro2Station);
              hoursOld = hydro2Age;
            }
          } else {
            // Oba pomiary są starsze niż 24h - wybierz nowszy z dwóch
            dataFreshness = 'stale';
            if (hydroAge <= hydro2Age) {
              selectedData = this.normalizeHydroData(hydroStation);
              hoursOld = hydroAge;
            } else {
              selectedData = this.normalizeHydro2Data(hydro2Station);
              hoursOld = hydro2Age;
            }
          }
        } else if (hydroStation) {
          // Tylko hydro ma dane
          selectedData = this.normalizeHydroData(hydroStation);
          const age = this.calculateDataAge(hydroStation.stan_wody_data_pomiaru);
          hoursOld = age;
          dataFreshness = age < 24 ? 'fresh' : 'stale';
        } else if (hydro2Station) {
          // Tylko hydro2 ma dane
          selectedData = this.normalizeHydro2Data(hydro2Station);
          const age = this.calculateDataAge(hydro2Station.stan_data);
          hoursOld = age;
          dataFreshness = age < 24 ? 'fresh' : 'stale';
        } else {
          // Nie powinno się zdarzyć
          continue;
        }

        // Pobierz współrzędne z cache jeśli nie ma w danych
        if (!selectedData.longitude || !selectedData.latitude) {
          const cachedCoordinates = await CoordinatesCache.getCoordinates(stationId);
          if (cachedCoordinates) {
            selectedData.longitude = cachedCoordinates.longitude;
            selectedData.latitude = cachedCoordinates.latitude;
            selectedData.coordinatesSource = 'cache';
          } else {
            selectedData.coordinatesSource = 'none';
          }
        } else {
          selectedData.coordinatesSource = 'hydro2';
        }

                 // Pobierz poziomy alarmowe i status
         const alarmData = HydroLevelsService.getAlarmStatus(stationId, selectedData.waterLevel || null);

                 // Utwórz finalny obiekt stacji
         const smartStation: SmartStationData = {
           id: selectedData.id!,
           name: selectedData.name!,
           waterLevel: selectedData.waterLevel || null,
           waterLevelDate: selectedData.waterLevelDate!,
           flow: selectedData.flow || null,
           flowDate: selectedData.flowDate || null,
           river: selectedData.river,
           voivodeship: selectedData.voivodeship,
           longitude: selectedData.longitude || null,
           latitude: selectedData.latitude || null,
           coordinatesSource: selectedData.coordinatesSource!,
           source: selectedData.source!,
           dataFreshness,
           hoursOld,
           timestamp: selectedData.timestamp!,
           // Dane alarmowe
           warningLevel: alarmData.warningLevel,
           alarmLevel: alarmData.alarmLevel,
           alarmStatus: alarmData.status,
           alarmMessage: dataFreshness === 'stale' 
             ? `Dane nieaktualne od ${hoursOld} godzin` 
             : alarmData.message
         };

        smartStations.push(smartStation);
      }

      console.log(`Processed ${smartStations.length} smart stations`);
      console.log(`Fresh data: ${smartStations.filter(s => s.dataFreshness === 'fresh').length}`);
      console.log(`Stale data: ${smartStations.filter(s => s.dataFreshness === 'stale').length}`);
      console.log(`From hydro: ${smartStations.filter(s => s.source === 'hydro').length}`);
      console.log(`From hydro2: ${smartStations.filter(s => s.source === 'hydro2').length}`);

      // Filtruj stacje według widoczności
      const visibleStations = await StationVisibilityService.filterVisibleStations(smartStations);
      console.log(`Visible stations: ${visibleStations.length} (hidden: ${smartStations.length - visibleStations.length})`);

      return visibleStations;
    } catch (error) {
      console.error('Error getting smart stations data:', error);
      return [];
    }
  }

  // Pobierz tylko stacje z współrzędnymi (do mapy)
  static async getSmartStationsForMap(): Promise<SmartStationData[]> {
    const allStations = await this.getSmartStationsData();
    return allStations.filter(station => 
      station.longitude !== null && 
      station.latitude !== null &&
      !isNaN(station.longitude) &&
      !isNaN(station.latitude)
    );
  }

  // Pobierz stację po ID
  static async getSmartStationById(stationId: string): Promise<SmartStationData | null> {
    try {
      const allStations = await this.getSmartStationsData();
      return allStations.find(station => station.id === stationId) || null;
    } catch (error) {
      console.error('Error getting smart station by ID:', error);
      return null;
    }
  }

  // Statystyki inteligentnego serwisu
  static async getSmartDataStats() {
    try {
      const stations = await this.getSmartStationsData();
      
      return {
        totalStations: stations.length,
        freshData: stations.filter(s => s.dataFreshness === 'fresh').length,
        staleData: stations.filter(s => s.dataFreshness === 'stale').length,
        fromHydro: stations.filter(s => s.source === 'hydro').length,
        fromHydro2: stations.filter(s => s.source === 'hydro2').length,
        withCoordinates: stations.filter(s => s.longitude && s.latitude).length,
        alarmStats: {
          normal: stations.filter(s => s.alarmStatus === 'normal').length,
          warning: stations.filter(s => s.alarmStatus === 'warning').length,
          alarm: stations.filter(s => s.alarmStatus === 'alarm').length,
          unknown: stations.filter(s => s.alarmStatus === 'unknown').length
        },
        averageDataAge: Math.round(
          stations.reduce((sum, s) => sum + (s.hoursOld || 0), 0) / stations.length
        )
      };
    } catch (error) {
      console.error('Error getting smart data stats:', error);
      return null;
    }
  }
} 