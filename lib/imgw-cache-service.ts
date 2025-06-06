import { SmartDataService } from './smart-data-service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live w milisekundach
}

interface CacheStats {
  totalEntries: number;
  lastUpdate: string | null;
  nextUpdate: string | null;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  lastApiCall: string | null;
  cacheSize: string;
}

export class IMGWCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static stats = {
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    lastApiCall: null as string | null
  };
  
  // Domyślny TTL - 60 minut
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 60 minut w ms
  private static readonly CACHE_KEYS = {
    SMART_STATIONS: 'smart_stations_data',
    SMART_STATIONS_MAP: 'smart_stations_map_data',
    COORDINATES_STATS: 'coordinates_stats',
    STATION_MEASUREMENTS: 'station_measurements_'
  };

  // Sprawdź czy dane w cache są świeże
  private static isDataFresh(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  // Pobierz dane z cache lub API
  private static async getOrFetch<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Sprawdź czy mamy świeże dane w cache
    if (cached && this.isDataFresh(cached)) {
      this.stats.cacheHits++;
      console.log(`🎯 Cache HIT for ${key} (age: ${Math.round((Date.now() - cached.timestamp) / 1000 / 60)}min)`);
      return cached.data;
    }

    // Cache miss - pobierz z API
    this.stats.cacheMisses++;
    this.stats.apiCalls++;
    this.stats.lastApiCall = new Date().toISOString();
    
    console.log(`🔄 Cache MISS for ${key} - fetching from API...`);
    
    try {
      const data = await fetchFunction();
      
      // Zapisz w cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
      
      console.log(`✅ Data cached for ${key} (TTL: ${ttl/1000/60}min)`);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${key}:`, error);
      
      // Jeśli mamy stare dane w cache, użyj ich jako fallback
      if (cached) {
        console.log(`🔄 Using stale cache data for ${key} as fallback`);
        this.stats.cacheHits++;
        return cached.data;
      }
      
      throw error;
    }
  }

  // Pobierz wszystkie stacje (z cache lub API)
  static async getSmartStationsData(ttl: number = this.DEFAULT_TTL) {
    return this.getOrFetch(
      this.CACHE_KEYS.SMART_STATIONS,
      () => SmartDataService.getSmartStationsData(),
      ttl
    );
  }

  // Pobierz stacje dla mapy (z cache lub API)
  static async getSmartStationsForMap(ttl: number = this.DEFAULT_TTL) {
    return this.getOrFetch(
      this.CACHE_KEYS.SMART_STATIONS_MAP,
      () => SmartDataService.getSmartStationsForMap(),
      ttl
    );
  }

  // Pobierz statystyki współrzędnych (z cache lub API)
  static async getCoordinatesStats(ttl: number = this.DEFAULT_TTL) {
    return this.getOrFetch(
      this.CACHE_KEYS.COORDINATES_STATS,
      () => SmartDataService.getSmartDataStats(),
      ttl
    );
  }

  // Pobierz pomiary stacji (z cache lub API)
  static async getStationMeasurements(
    stationId: string, 
    days: number = 7, 
    limit: number = 100,
    fetchFunction: () => Promise<any>,
    ttl: number = 30 * 60 * 1000 // 30 minut TTL dla pomiarów
  ) {
    const cacheKey = `${this.CACHE_KEYS.STATION_MEASUREMENTS}${stationId}_${days}d_${limit}`;
    return this.getOrFetch(cacheKey, fetchFunction, ttl);
  }

  // Wymuś odświeżenie cache dla konkretnego klucza
  static async refreshCache(key: string): Promise<boolean> {
    try {
      this.cache.delete(key);
      console.log(`🔄 Cache cleared for ${key}`);
      
      // Pobierz świeże dane (automatycznie zapisze w cache)
      switch (key) {
        case this.CACHE_KEYS.SMART_STATIONS:
          await this.getSmartStationsData();
          break;
        case this.CACHE_KEYS.SMART_STATIONS_MAP:
          await this.getSmartStationsForMap();
          break;
        case this.CACHE_KEYS.COORDINATES_STATS:
          await this.getCoordinatesStats();
          break;
        default:
          console.warn(`Unknown cache key: ${key}`);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error refreshing cache for ${key}:`, error);
      return false;
    }
  }

  // Wymuś odświeżenie całego cache
  static async refreshAllCache(): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    for (const key of Object.values(this.CACHE_KEYS)) {
      const success = await this.refreshCache(key);
      if (success) {
        results.success.push(key);
      } else {
        results.failed.push(key);
      }
    }
    
    return results;
  }

  // Wyczyść cały cache
  static clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${size} cache entries`);
  }

  // Pobierz statystyki cache
  static getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    console.log(`📊 Cache stats: ${entries.length} entries, ${this.stats.cacheHits} hits, ${this.stats.cacheMisses} misses`);
    
    // Znajdź najstarszy wpis
    let oldestEntry: CacheEntry<any> | null = null;
    let newestEntry: CacheEntry<any> | null = null;
    
    for (const [, entry] of entries) {
      if (!oldestEntry || entry.timestamp < oldestEntry.timestamp) {
        oldestEntry = entry;
      }
      if (!newestEntry || entry.timestamp > newestEntry.timestamp) {
        newestEntry = entry;
      }
    }

    // Oblicz następne odświeżenie (dla najstarszego wpisu)
    let nextUpdate: string | null = null;
    if (oldestEntry) {
      const nextUpdateTime = oldestEntry.timestamp + oldestEntry.ttl;
      nextUpdate = new Date(nextUpdateTime).toISOString();
    }

    // Oblicz rozmiar cache w pamięci (przybliżony)
    const cacheSize = this.calculateCacheSize();

    return {
      totalEntries: this.cache.size,
      lastUpdate: newestEntry ? new Date(newestEntry.timestamp).toISOString() : null,
      nextUpdate,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      apiCalls: this.stats.apiCalls,
      lastApiCall: this.stats.lastApiCall,
      cacheSize
    };
  }

  // Oblicz przybliżony rozmiar cache w pamięci
  private static calculateCacheSize(): string {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Przybliżony rozmiar klucza i danych
      totalSize += key.length * 2; // UTF-16
      totalSize += JSON.stringify(entry).length * 2; // UTF-16
    }
    
    // Konwertuj na czytelny format
    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(1)} KB`;
    } else {
      return `${(totalSize / 1024 / 1024).toFixed(1)} MB`;
    }
  }

  // Sprawdź które wpisy w cache wygasły
  static getExpiredEntries(): string[] {
    const expired: string[] = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        expired.push(key);
      }
    }
    
    return expired;
  }

  // Wyczyść wygasłe wpisy
  static cleanupExpiredEntries(): number {
    const expired = this.getExpiredEntries();
    
    for (const key of expired) {
      this.cache.delete(key);
    }
    
    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired cache entries`);
    }
    
    return expired.length;
  }

  // Ustaw niestandardowy TTL dla wszystkich przyszłych operacji
  static setDefaultTTL(minutes: number): void {
    // Nie zmieniamy DEFAULT_TTL, ale możemy dodać tę funkcjonalność w przyszłości
    console.log(`ℹ️ Note: Default TTL is ${this.DEFAULT_TTL / 1000 / 60} minutes`);
  }
} 