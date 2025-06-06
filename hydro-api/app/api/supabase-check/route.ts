import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: "postgresql://postgres.twphrnydxzqszumytryu:marcinhiszpanek123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    // Sprawdź czy tabele istnieją
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stations', 'measurements', 'alerts')
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Found tables:', tables);

    let data: any = {
      tablesFound: tables,
      totalStations: 0,
      totalMeasurements: 0,
      oldestMeasurement: null,
      newestMeasurement: null,
      recentMeasurements: { last60Days: 0 },
      measurementsByMonth: []
    };

    // Jeśli tabele istnieją, pobierz dane
    if (tables.includes('stations')) {
      const stationsResult = await client.query('SELECT COUNT(*) as count FROM stations');
      data.totalStations = parseInt(stationsResult.rows[0].count);
    }

    if (tables.includes('measurements')) {
      // Łączna liczba pomiarów
      const measurementsResult = await client.query('SELECT COUNT(*) as count FROM measurements');
      data.totalMeasurements = parseInt(measurementsResult.rows[0].count);

      // Najstarszy pomiar
      const oldestResult = await client.query(`
        SELECT measurement_timestamp, created_at 
        FROM measurements 
        ORDER BY measurement_timestamp ASC 
        LIMIT 1
      `);
      
      if (oldestResult.rows.length > 0) {
        const oldest = oldestResult.rows[0];
        data.oldestMeasurement = {
          measurementDate: oldest.measurement_timestamp,
          createdAt: oldest.created_at,
          daysAgo: Math.floor((Date.now() - new Date(oldest.measurement_timestamp).getTime()) / (1000 * 60 * 60 * 24))
        };
      }

      // Najnowszy pomiar
      const newestResult = await client.query(`
        SELECT measurement_timestamp, created_at 
        FROM measurements 
        ORDER BY measurement_timestamp DESC 
        LIMIT 1
      `);
      
      if (newestResult.rows.length > 0) {
        const newest = newestResult.rows[0];
        data.newestMeasurement = {
          measurementDate: newest.measurement_timestamp,
          createdAt: newest.created_at,
          daysAgo: Math.floor((Date.now() - new Date(newest.measurement_timestamp).getTime()) / (1000 * 60 * 60 * 24))
        };
      }

      // Pomiary z ostatnich 60 dni
      const recentResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM measurements 
        WHERE measurement_timestamp >= NOW() - INTERVAL '60 days'
      `);
      
      data.recentMeasurements.last60Days = parseInt(recentResult.rows[0].count);

      // Pomiary pogrupowane po miesiącach (ostatnie 12 miesięcy)
      const monthlyResult = await client.query(`
        SELECT 
          DATE_TRUNC('month', measurement_timestamp) as month,
          COUNT(*) as count
        FROM measurements 
        WHERE measurement_timestamp >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', measurement_timestamp)
        ORDER BY month DESC
      `);
      
      data.measurementsByMonth = monthlyResult.rows;

      // Przykładowe stacje z najstarszymi pomiarami
      const sampleStationsResult = await client.query(`
        SELECT 
          s.station_code,
          s.station_name,
          MIN(m.measurement_timestamp) as oldest_measurement
        FROM stations s
        LEFT JOIN measurements m ON s.station_code = m.station_id
        WHERE m.measurement_timestamp IS NOT NULL
        GROUP BY s.station_code, s.station_name
        ORDER BY oldest_measurement ASC
        LIMIT 10
      `);
      
      data.sampleStationsWithHistory = sampleStationsResult.rows.map(row => ({
        id: row.station_code,
        name: row.station_name,
        oldestMeasurement: row.oldest_measurement ? {
          measurementTimestamp: row.oldest_measurement,
          daysAgo: Math.floor((Date.now() - new Date(row.oldest_measurement).getTime()) / (1000 * 60 * 60 * 24))
        } : null
      }));
    }

    await client.end();

    return NextResponse.json({
      status: 'success',
      database: 'Supabase PostgreSQL',
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Supabase check error:', error);
    
    try {
      await client.end();
    } catch (endError) {
      console.error('Error closing connection:', endError);
    }

    return NextResponse.json({
      status: 'error',
      message: 'Failed to check Supabase data',
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'Supabase PostgreSQL',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 