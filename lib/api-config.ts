// lib/api-config.ts
export type APIEndpoint = 'hydro' | 'hydro2';

export interface APIConfig {
  endpoint: APIEndpoint;
  baseUrl: string;
  fieldMapping: {
    stationId: string;
    stationName: string;
    waterLevel: string;
    waterLevelDate: string;
    flow?: string;
    flowDate?: string;
    river?: string;
    voivodeship?: string;
    longitude?: string;
    latitude?: string;
    icePhenom?: string;
    icePhenomDate?: string;
    overgrowthPhenom?: string;
    overgrowthPhenomDate?: string;
    waterTemp?: string;
    waterTempDate?: string;
  };
}

export const API_CONFIGS: Record<APIEndpoint, APIConfig> = {
  hydro: {
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
  },
  hydro2: {
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
  }
};

export function getAPIConfig(): APIConfig {
  const endpoint = (process.env.IMGW_API_ENDPOINT as APIEndpoint) || 'hydro';
  return API_CONFIGS[endpoint];
}

export function normalizeStationData(rawData: any, config: APIConfig) {
  const mapping = config.fieldMapping;
  
  return {
    id: rawData[mapping.stationId],
    name: rawData[mapping.stationName],
    waterLevel: rawData[mapping.waterLevel] ? parseFloat(rawData[mapping.waterLevel]) : null,
    waterLevelDate: rawData[mapping.waterLevelDate] || new Date().toISOString(),
    flow: mapping.flow && rawData[mapping.flow] ? parseFloat(rawData[mapping.flow]) : null,
    flowDate: mapping.flowDate ? rawData[mapping.flowDate] : null,
    river: mapping.river ? rawData[mapping.river] : null,
    voivodeship: mapping.voivodeship ? rawData[mapping.voivodeship] : null,
    longitude: mapping.longitude && rawData[mapping.longitude] ? parseFloat(rawData[mapping.longitude]) : null,
    latitude: mapping.latitude && rawData[mapping.latitude] ? parseFloat(rawData[mapping.latitude]) : null,
    icePhenom: mapping.icePhenom ? rawData[mapping.icePhenom] : null,
    icePhenomDate: mapping.icePhenomDate ? rawData[mapping.icePhenomDate] : null,
    overgrowthPhenom: mapping.overgrowthPhenom ? rawData[mapping.overgrowthPhenom] : null,
    overgrowthPhenomDate: mapping.overgrowthPhenomDate ? rawData[mapping.overgrowthPhenomDate] : null,
    waterTemp: mapping.waterTemp && rawData[mapping.waterTemp] ? parseFloat(rawData[mapping.waterTemp]) : null,
    waterTempDate: mapping.waterTempDate ? rawData[mapping.waterTempDate] : null,
    // Metadata
    source: config.endpoint,
    timestamp: new Date().toISOString()
  };
} 