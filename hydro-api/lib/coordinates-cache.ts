// lib/coordinates-cache.ts
export interface StationCoordinates {
  stationId: string;
  longitude: number;
  latitude: number;
  lastUpdated: string;
  source: 'hydro2';
}

export class CoordinatesCache {
  private static cache = new Map<string, StationCoordinates>();
  private static initialized = false;

  // Inicjalizuj cache z danych hydro2
  static async initializeFromHydro2(hydro2Data: any[]): Promise<void> {
    try {
      console.log(`Initializing coordinates cache with ${hydro2Data.length} hydro2 records`);
      
      for (const item of hydro2Data) {
        const stationId = item.kod_stacji;
        const lon = parseFloat(item.lon);
        const lat = parseFloat(item.lat);
        
        if (stationId && !isNaN(lon) && !isNaN(lat)) {
          this.cache.set(stationId, {
            stationId,
            longitude: lon,
            latitude: lat,
            lastUpdated: new Date().toISOString(),
            source: 'hydro2'
          });
        }
      }
      
      this.initialized = true;
      console.log(`Coordinates cache initialized with ${this.cache.size} stations`);
    } catch (error) {
      console.error('Error initializing coordinates cache:', error);
    }
  }

  // Odśwież wszystkie współrzędne
  static async refreshAllCoordinates(hydro2Data: any[]): Promise<void> {
    this.cache.clear();
    await this.initializeFromHydro2(hydro2Data);
  }

  // Pobierz współrzędne dla stacji
  static async getCoordinates(stationId: string): Promise<StationCoordinates | null> {
    return this.cache.get(stationId) || null;
  }

  // Pobierz wszystkie współrzędne
  static async getAllCoordinates(): Promise<StationCoordinates[]> {
    return Array.from(this.cache.values());
  }

  // Sprawdź czy cache jest zainicjalizowany
  static isInitialized(): boolean {
    return this.initialized;
  }

  // Pobierz statystyki cache
  static getStats() {
    return {
      totalStations: this.cache.size,
      initialized: this.initialized,
      lastUpdated: this.cache.size > 0 ? 
        Math.max(...Array.from(this.cache.values()).map(c => new Date(c.lastUpdated).getTime())) : null
    };
  }
} 