 // types/hydro.ts
export interface IMGWHydroResponse {
    id_stacji: string;
    stacja: string;
    rzeka: string;
    wojewodztwo: string;
    stan_wody: string;
    stan_wody_data_pomiaru: string;
    temperatura_wody?: string;
    zjawisko_lodowe?: string;
    zjawisko_zarastania?: string;
  }
  
  export interface IMGWHydro2Response {
    id_stacji: string;
    stacja: string;
    rzeka: string;
    wojewodztwo: string;
    stan_wody: string;
    stan_wody_data_pomiaru: string;
    przelyw?: string;
    temperatura_wody?: string;
  }
  
  export interface StationData {
    id_stacji: string;
    stacja: string;
    rzeka: string;
    województwo: string;
    stan_wody: string;
    stan_wody_data_pomiaru: string;
    przelyw?: string;
    temperatura_wody?: string;
    poziom_ostrzegawczy?: string;
    poziom_alarmowy?: string;
    longitude?: string;
    latitude?: string;
    poprzedni_pomiar?: string;
    poprzedni_pomiar_data?: string;
    trend?: 'rising' | 'falling' | 'stable';
    zmiana_poziomu?: string;
  }
  
  export interface APIResponse {
    status: 'success' | 'error';
    data?: {
      station: StationData;
    };
    stations?: StationData[];
    message?: string;
    timestamp: string;
  }
  
  export interface DatabaseStation {
    id: string;
    stationCode: string;
    stationName: string;
    riverName?: string;
    voivodeship?: string;
    latitude?: number;
    longitude?: number;
    warningLevel?: number;
    alarmLevel?: number;
    measurements: DatabaseMeasurement[];
  }
  
  export interface DatabaseMeasurement {
    id: string;
    measurementTimestamp: Date;
    waterLevel?: number;
    flowRate?: number;
    temperature?: number;
    source: string;
  }