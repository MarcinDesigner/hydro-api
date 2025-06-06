import fs from 'fs';
import path from 'path';

interface StationVisibility {
  stationId: string;
  isVisible: boolean;
  hiddenAt?: string;
  hiddenBy?: string;
  reason?: string;
}

export class StationVisibilityService {
  private static readonly VISIBILITY_FILE = path.join(process.cwd(), 'data', 'station-visibility.json');
  private static visibilityCache: Map<string, boolean> = new Map();
  private static cacheInitialized = false;

  // Inicjalizuj cache z pliku
  private static async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      // Upewnij się, że katalog data istnieje
      const dataDir = path.dirname(this.VISIBILITY_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Wczytaj dane z pliku jeśli istnieje
      if (fs.existsSync(this.VISIBILITY_FILE)) {
        const data = fs.readFileSync(this.VISIBILITY_FILE, 'utf-8');
        const visibilityData: StationVisibility[] = JSON.parse(data);
        
        this.visibilityCache.clear();
        visibilityData.forEach(item => {
          this.visibilityCache.set(item.stationId, item.isVisible);
        });
        
        console.log(`Loaded visibility settings for ${visibilityData.length} stations`);
      } else {
        // Utwórz pusty plik
        await this.saveVisibilityData([]);
        console.log('Created new station visibility file');
      }
      
      this.cacheInitialized = true;
    } catch (error) {
      console.error('Error initializing station visibility cache:', error);
      this.cacheInitialized = true; // Kontynuuj mimo błędu
    }
  }

  // Zapisz dane do pliku
  private static async saveVisibilityData(data: StationVisibility[]): Promise<void> {
    try {
      const dataDir = path.dirname(this.VISIBILITY_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.VISIBILITY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving station visibility data:', error);
      throw error;
    }
  }

  // Pobierz wszystkie dane widoczności
  private static async getAllVisibilityData(): Promise<StationVisibility[]> {
    try {
      if (!fs.existsSync(this.VISIBILITY_FILE)) {
        return [];
      }
      
      const data = fs.readFileSync(this.VISIBILITY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading visibility data:', error);
      return [];
    }
  }

  // Sprawdź czy stacja jest widoczna
  static async isStationVisible(stationId: string): Promise<boolean> {
    await this.initializeCache();
    
    // Domyślnie stacje są widoczne
    return this.visibilityCache.get(stationId) ?? true;
  }

  // Ustaw widoczność stacji
  static async setStationVisibility(
    stationId: string, 
    isVisible: boolean, 
    reason?: string,
    hiddenBy?: string
  ): Promise<void> {
    await this.initializeCache();
    
    try {
      // Aktualizuj cache
      this.visibilityCache.set(stationId, isVisible);
      
      // Wczytaj wszystkie dane
      const allData = await this.getAllVisibilityData();
      
      // Znajdź lub utwórz wpis dla stacji
      const existingIndex = allData.findIndex(item => item.stationId === stationId);
      
      const visibilityItem: StationVisibility = {
        stationId,
        isVisible,
        hiddenAt: !isVisible ? new Date().toISOString() : undefined,
        hiddenBy,
        reason
      };
      
      if (existingIndex >= 0) {
        allData[existingIndex] = visibilityItem;
      } else {
        allData.push(visibilityItem);
      }
      
      // Zapisz do pliku
      await this.saveVisibilityData(allData);
      
      console.log(`Station ${stationId} visibility set to ${isVisible}`);
    } catch (error) {
      console.error('Error setting station visibility:', error);
      throw error;
    }
  }

  // Przełącz widoczność stacji
  static async toggleStationVisibility(stationId: string, reason?: string): Promise<boolean> {
    const currentVisibility = await this.isStationVisible(stationId);
    const newVisibility = !currentVisibility;
    
    await this.setStationVisibility(stationId, newVisibility, reason);
    return newVisibility;
  }

  // Pobierz listę ukrytych stacji
  static async getHiddenStations(): Promise<StationVisibility[]> {
    await this.initializeCache();
    
    const allData = await this.getAllVisibilityData();
    return allData.filter(item => !item.isVisible);
  }

  // Pobierz statystyki widoczności
  static async getVisibilityStats(): Promise<{
    totalStations: number;
    visibleStations: number;
    hiddenStations: number;
    hiddenStationsList: StationVisibility[];
  }> {
    await this.initializeCache();
    
    const hiddenStations = await this.getHiddenStations();
    const totalStations = this.visibilityCache.size;
    const hiddenCount = hiddenStations.length;
    
    return {
      totalStations,
      visibleStations: totalStations - hiddenCount,
      hiddenStations: hiddenCount,
      hiddenStationsList: hiddenStations
    };
  }

  // Filtruj stacje według widoczności
  static async filterVisibleStations<T extends { id: string }>(stations: T[]): Promise<T[]> {
    await this.initializeCache();
    
    const visibleStations: T[] = [];
    
    for (const station of stations) {
      const isVisible = await this.isStationVisible(station.id);
      if (isVisible) {
        visibleStations.push(station);
      }
    }
    
    return visibleStations;
  }

  // Przywróć widoczność wszystkich stacji
  static async showAllStations(): Promise<void> {
    await this.initializeCache();
    
    try {
      // Wyczyść cache
      this.visibilityCache.clear();
      
      // Wyczyść plik
      await this.saveVisibilityData([]);
      
      console.log('All stations visibility restored');
    } catch (error) {
      console.error('Error restoring all stations visibility:', error);
      throw error;
    }
  }
} 