-- Tworzenie tabel dla Hydro API w Supabase
-- Uruchom ten kod w Supabase SQL Editor

-- Tabela stacji hydrologicznych
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    station_code TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    river_name TEXT,
    voivodeship TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    warning_level INTEGER,
    alarm_level INTEGER,
    api_visible BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela pomiarów
CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    water_level INTEGER,
    flow_rate DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela alertów
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    measurement_id TEXT REFERENCES measurements(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    water_level INTEGER,
    threshold_level INTEGER,
    is_active BOOLEAN DEFAULT true NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela mapowania rzek
CREATE TABLE IF NOT EXISTS rivers_mapping (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    original_name TEXT UNIQUE NOT NULL,
    normalized_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    basin TEXT,
    "order" INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_measurements_station_timestamp ON measurements(station_id, measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_station_active ON alerts(station_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_type_active ON alerts(alert_type, is_active);

-- Funkcja do automatycznego aktualizowania updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggery dla updated_at
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rivers_mapping_updated_at BEFORE UPDATE ON rivers_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Włączenie Row Level Security (opcjonalne)
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivers_mapping ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla publicznego odczytu
CREATE POLICY "Allow public read stations" ON stations FOR SELECT USING (api_visible = true);
CREATE POLICY "Allow public read measurements" ON measurements FOR SELECT USING (true);
CREATE POLICY "Allow public read alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Allow public read rivers" ON rivers_mapping FOR SELECT USING (true);

-- Komentarze do tabel
COMMENT ON TABLE stations IS 'Stacje hydrologiczne IMGW';
COMMENT ON TABLE measurements IS 'Pomiary poziomów wody, przepływu i temperatury';
COMMENT ON TABLE alerts IS 'Alerty o przekroczeniu progów ostrzegawczych';
COMMENT ON TABLE rivers_mapping IS 'Mapowanie i normalizacja nazw rzek'; 