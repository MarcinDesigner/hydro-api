import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;

    const station = await prisma.station.findFirst({
      where: {
        stationCode: stationId
      }
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      station
    });
  } catch (error) {
    console.error('Error fetching station:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    const body = await request.json();
    
    const { riverName, warningLevel, alarmLevel } = body;

    // Walidacja danych
    if (warningLevel !== null && warningLevel !== undefined && (isNaN(warningLevel) || warningLevel < 0)) {
      return NextResponse.json(
        { error: 'Warning level must be a positive number' },
        { status: 400 }
      );
    }

    if (alarmLevel !== null && alarmLevel !== undefined && (isNaN(alarmLevel) || alarmLevel < 0)) {
      return NextResponse.json(
        { error: 'Alarm level must be a positive number' },
        { status: 400 }
      );
    }

    if (warningLevel && alarmLevel && warningLevel >= alarmLevel) {
      return NextResponse.json(
        { error: 'Warning level must be lower than alarm level' },
        { status: 400 }
      );
    }

    // Sprawdź czy stacja istnieje
    const existingStation = await prisma.station.findFirst({
      where: {
        stationCode: stationId
      }
    });

    let station;
    if (existingStation) {
      // Aktualizuj istniejącą stację
      station = await prisma.station.update({
        where: {
          id: existingStation.id
        },
        data: {
          riverName: riverName || existingStation.riverName,
          warningLevel: warningLevel !== undefined ? warningLevel : existingStation.warningLevel,
          alarmLevel: alarmLevel !== undefined ? alarmLevel : existingStation.alarmLevel,
        }
      });
    } else {
      // Utwórz nową stację jeśli nie istnieje
      station = await prisma.station.create({
        data: {
          stationCode: stationId,
          stationName: `Station ${stationId}`, // Domyślna nazwa
          riverName: riverName || null,
          warningLevel: warningLevel || null,
          alarmLevel: alarmLevel || null,
        }
      });
    }

    return NextResponse.json({
      status: 'success',
      station,
      message: 'Station updated successfully'
    });
  } catch (error) {
    console.error('Error updating station:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 