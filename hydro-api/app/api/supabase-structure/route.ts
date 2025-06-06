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

    // Sprawdź strukturę tabeli measurements
    const measurementsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'measurements' 
      ORDER BY ordinal_position;
    `);

    // Sprawdź strukturę tabeli stations
    const stationsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'stations' 
      ORDER BY ordinal_position;
    `);

    // Sprawdź przykładowe dane z measurements
    const sampleMeasurements = await client.query(`
      SELECT * FROM measurements 
      ORDER BY measurement_timestamp ASC 
      LIMIT 5;
    `);

    // Sprawdź przykładowe dane ze stations
    const sampleStations = await client.query(`
      SELECT * FROM stations 
      LIMIT 5;
    `);

    // Sprawdź relacje między tabelami
    const relationCheck = await client.query(`
      SELECT 
        m.station_id,
        s.station_code,
        s.station_name,
        COUNT(m.id) as measurement_count
      FROM measurements m
      LEFT JOIN stations s ON m.station_id = s.id
      GROUP BY m.station_id, s.station_code, s.station_name
      ORDER BY measurement_count DESC
      LIMIT 10;
    `);

    await client.end();

    return NextResponse.json({
      status: 'success',
      data: {
        measurementsStructure: measurementsStructure.rows,
        stationsStructure: stationsStructure.rows,
        sampleMeasurements: sampleMeasurements.rows,
        sampleStations: sampleStations.rows,
        relationCheck: relationCheck.rows
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Supabase structure check error:', error);
    
    try {
      await client.end();
    } catch (endError) {
      console.error('Error closing connection:', endError);
    }

    return NextResponse.json({
      status: 'error',
      message: 'Failed to check Supabase structure',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 