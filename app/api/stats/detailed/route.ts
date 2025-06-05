import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Funkcja do analizy przestrzennej
async function generateSpatialAnalysis(measurements: any[]) {
  // Analiza przepływu fal przez stacje na tej samej rzece
  const riverFlowAnalysis = analyzeRiverFlow(measurements);
  
  // Analiza dorzeczy
  const basinAnalysis = analyzeBasins(measurements);
  
  // Identyfikacja krytycznych punktów
  const criticalPoints = identifyCriticalPoints(measurements);
  
  return {
    riverFlowAnalysis,
    basinAnalysis,
    criticalPoints
  };
}

// Analiza przepływu fal przez stacje na tej samej rzece
function analyzeRiverFlow(measurements: any[]) {
  const riverGroups = new Map<string, any[]>();
  
  // Grupuj pomiary według rzek
  measurements.forEach(measurement => {
    const riverName = measurement.station.riverName || 'Nieznana';
    if (!riverGroups.has(riverName)) {
      riverGroups.set(riverName, []);
    }
    const riverGroup = riverGroups.get(riverName);
    if (riverGroup) {
      riverGroup.push(measurement);
    }
  });

  const riverFlowData = [];
  
  for (const [riverName, riverMeasurements] of riverGroups.entries()) {
    if (riverMeasurements.length < 2) continue;
    
    // Grupuj pomiary według stacji
    const stationGroups = new Map<string, any[]>();
    riverMeasurements.forEach(measurement => {
      const stationId = measurement.stationId;
      if (!stationGroups.has(stationId)) {
        stationGroups.set(stationId, []);
      }
      const stationGroup = stationGroups.get(stationId);
      if (stationGroup) {
        stationGroup.push(measurement);
      }
    });

    if (stationGroups.size < 2) continue;

    // Oblicz korelacje między stacjami
    const stations = Array.from(stationGroups.entries()).map(([stationId, stationMeasurements]) => {
      const waterLevels = stationMeasurements
        .filter(m => m.waterLevel !== null)
        .sort((a, b) => a.measurementTimestamp.getTime() - b.measurementTimestamp.getTime())
        .map(m => ({ time: m.measurementTimestamp, level: m.waterLevel }));
      
      const avgLevel = waterLevels.reduce((sum, m) => sum + m.level, 0) / waterLevels.length;
      const maxLevel = Math.max(...waterLevels.map(m => m.level));
      const minLevel = Math.min(...waterLevels.map(m => m.level));
      
      return {
        stationId,
        stationName: stationMeasurements[0].station.stationName,
        latitude: stationMeasurements[0].station.latitude,
        longitude: stationMeasurements[0].station.longitude,
        waterLevels,
        avgLevel,
        maxLevel,
        minLevel,
        range: maxLevel - minLevel
      };
    }).filter(s => s.latitude && s.longitude);

    // Sortuj stacje według położenia (uproszczone - według szerokości geograficznej)
    stations.sort((a, b) => (b.latitude || 0) - (a.latitude || 0));

    // Oblicz opóźnienia między stacjami (uproszczone)
    const stationDelays = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const upstream = stations[i];
      const downstream = stations[i + 1];
      
      // Znajdź podobne wzorce w poziomach wody
      const correlation = calculateSimpleCorrelation(upstream.waterLevels, downstream.waterLevels);
      
      stationDelays.push({
        upstreamStation: upstream.stationName,
        downstreamStation: downstream.stationName,
        correlation: correlation,
        distance: calculateDistance(upstream.latitude!, upstream.longitude!, downstream.latitude!, downstream.longitude!),
        avgLevelDifference: downstream.avgLevel - upstream.avgLevel
      });
    }

    riverFlowData.push({
      river: riverName,
      stationCount: stations.length,
      stations: stations.map(s => ({
        name: s.stationName,
        avgLevel: s.avgLevel,
        range: s.range
      })),
      flowPattern: stationDelays,
      totalRange: Math.max(...stations.map(s => s.maxLevel)) - Math.min(...stations.map(s => s.minLevel))
    });
  }

  return riverFlowData.sort((a, b) => b.totalRange - a.totalRange);
}

// Analiza dorzeczy
function analyzeBasins(measurements: any[]) {
  // Mapowanie rzek do dorzeczy (uproszczone)
  const basinMapping: { [key: string]: string } = {
    'Wisła': 'Dorzecze Wisły',
    'Dunajec': 'Dorzecze Wisły',
    'San': 'Dorzecze Wisły',
    'Narew': 'Dorzecze Wisły',
    'Bug': 'Dorzecze Wisły',
    'Pilica': 'Dorzecze Wisły',
    'Kamienna': 'Dorzecze Wisły',
    'Odra': 'Dorzecze Odry',
    'Warta': 'Dorzecze Odry',
    'Noteć': 'Dorzecze Odry',
    'Bóbr': 'Dorzecze Odry',
    'Nysa Łużycka': 'Dorzecze Odry',
    'Parsęta': 'Dorzecze Przymorza',
    'Słupia': 'Dorzecze Przymorza',
    'Łeba': 'Dorzecze Przymorza'
  };

  const basinGroups = new Map<string, any[]>();
  
  measurements.forEach(measurement => {
    const riverName = measurement.station.riverName || 'Nieznana';
    const basinName = basinMapping[riverName] || 'Inne dorzecza';
    
    if (!basinGroups.has(basinName)) {
      basinGroups.set(basinName, []);
    }
    const basinGroup = basinGroups.get(basinName);
    if (basinGroup) {
      basinGroup.push(measurement);
    }
  });

  const basinStats = Array.from(basinGroups.entries()).map(([basinName, basinMeasurements]) => {
    const waterLevels = basinMeasurements
      .filter(m => m.waterLevel !== null)
      .map(m => m.waterLevel);

    if (waterLevels.length === 0) {
      return {
        basin: basinName,
        stationCount: 0,
        riverCount: 0,
        avgLevel: 0,
        minLevel: 0,
        maxLevel: 0,
        range: 0,
        standardDeviation: 0,
        fluctuationIndex: 0
      };
    }

    const avgLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
    const minLevel = Math.min(...waterLevels);
    const maxLevel = Math.max(...waterLevels);
    const range = maxLevel - minLevel;

    const variance = waterLevels.reduce((sum, level) => {
      return sum + Math.pow(level - avgLevel, 2);
    }, 0) / waterLevels.length;
    const standardDeviation = Math.sqrt(variance);

    // Indeks fluktuacji (odchylenie standardowe / średnia)
    const fluctuationIndex = avgLevel > 0 ? (standardDeviation / avgLevel) * 100 : 0;

    const uniqueStations = new Set(basinMeasurements.map(m => m.stationId)).size;
    const uniqueRivers = new Set(basinMeasurements.map(m => m.station.riverName)).size;

    return {
      basin: basinName,
      stationCount: uniqueStations,
      riverCount: uniqueRivers,
      avgLevel,
      minLevel,
      maxLevel,
      range,
      standardDeviation,
      fluctuationIndex
    };
  });

  return basinStats.sort((a, b) => b.fluctuationIndex - a.fluctuationIndex);
}

// Identyfikacja krytycznych punktów
function identifyCriticalPoints(measurements: any[]) {
  const stationGroups = new Map<string, any[]>();
  
  measurements.forEach(measurement => {
    const stationId = measurement.stationId;
    if (!stationGroups.has(stationId)) {
      stationGroups.set(stationId, []);
    }
    const stationGroup = stationGroups.get(stationId);
    if (stationGroup) {
      stationGroup.push(measurement);
    }
  });

  const criticalPoints = [];

  for (const [stationId, stationMeasurements] of stationGroups.entries()) {
    const station = stationMeasurements[0].station;
    const waterLevels = stationMeasurements
      .filter(m => m.waterLevel !== null)
      .map(m => m.waterLevel);

    if (waterLevels.length < 5) continue;

    const avgLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
    const maxLevel = Math.max(...waterLevels);
    const minLevel = Math.min(...waterLevels);
    const range = maxLevel - minLevel;

    const variance = waterLevels.reduce((sum, level) => {
      return sum + Math.pow(level - avgLevel, 2);
    }, 0) / waterLevels.length;
    const standardDeviation = Math.sqrt(variance);

    // Kryteria dla krytycznych punktów
    const isHighVariability = standardDeviation > avgLevel * 0.3;
    const isExtremeRange = range > avgLevel * 0.8;
    const isHighLevel = avgLevel > 300; // cm
    const isLowLevel = avgLevel < 50; // cm

    let criticalityScore = 0;
    const reasons = [];

    if (isHighVariability) {
      criticalityScore += 3;
      reasons.push('Wysoka zmienność poziomów');
    }
    if (isExtremeRange) {
      criticalityScore += 2;
      reasons.push('Ekstremalny zakres poziomów');
    }
    if (isHighLevel) {
      criticalityScore += 2;
      reasons.push('Wysokie średnie poziomy');
    }
    if (isLowLevel) {
      criticalityScore += 1;
      reasons.push('Niskie średnie poziomy');
    }

    // Sprawdź poziomy alarmowe
    if (station.warningLevel && maxLevel > station.warningLevel) {
      criticalityScore += 2;
      reasons.push('Przekroczenie poziomu ostrzegawczego');
    }
    if (station.alarmLevel && maxLevel > station.alarmLevel) {
      criticalityScore += 3;
      reasons.push('Przekroczenie poziomu alarmowego');
    }

    if (criticalityScore >= 3) {
      criticalPoints.push({
        stationId,
        stationName: station.stationName,
        river: station.riverName || 'Nieznana',
        voivodeship: station.voivodeship || 'Nieznane',
        latitude: station.latitude,
        longitude: station.longitude,
        avgLevel,
        maxLevel,
        minLevel,
        range,
        standardDeviation,
        criticalityScore,
        reasons,
        warningLevel: station.warningLevel,
        alarmLevel: station.alarmLevel,
        riskLevel: criticalityScore >= 6 ? 'Wysokie' : criticalityScore >= 4 ? 'Średnie' : 'Niskie'
      });
    }
  }

  return criticalPoints.sort((a, b) => b.criticalityScore - a.criticalityScore);
}

// Funkcje pomocnicze
function calculateSimpleCorrelation(series1: any[], series2: any[]): number {
  if (series1.length === 0 || series2.length === 0) return 0;
  
  // Uproszczona korelacja - porównanie trendów
  const trend1 = series1.length > 1 ? series1[series1.length - 1].level - series1[0].level : 0;
  const trend2 = series2.length > 1 ? series2[series2.length - 1].level - series2[0].level : 0;
  
  if (trend1 === 0 && trend2 === 0) return 1;
  if (trend1 === 0 || trend2 === 0) return 0;
  
  return Math.abs(trend1 * trend2) / (Math.abs(trend1) * Math.abs(trend2));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Promień Ziemi w km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Funkcja do generowania analiz praktycznych zastosowań
async function generatePracticalApplications(measurements: any[]) {
  // Modelowanie ryzyka powodziowego
  const floodRiskModeling = generateFloodRiskModeling(measurements);
  
  // Wczesne ostrzeganie i predykcja zagrożeń
  const earlyWarningSystem = generateEarlyWarningSystem(measurements);
  
  return {
    floodRiskModeling,
    earlyWarningSystem
  };
}

// Modelowanie ryzyka powodziowego
function generateFloodRiskModeling(measurements: any[]) {
  const stationGroups = new Map<string, any[]>();
  
  measurements.forEach(measurement => {
    const stationId = measurement.stationId;
    if (!stationGroups.has(stationId)) {
      stationGroups.set(stationId, []);
    }
    const stationGroup = stationGroups.get(stationId);
    if (stationGroup) {
      stationGroup.push(measurement);
    }
  });

  const riskAssessments = [];
  const regionalRisk = new Map<string, any[]>();

  for (const [stationId, stationMeasurements] of stationGroups.entries()) {
    const station = stationMeasurements[0].station;
    const waterLevels = stationMeasurements
      .filter(m => m.waterLevel !== null)
      .map(m => m.waterLevel);

    if (waterLevels.length < 3) continue;

    const avgLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
    const maxLevel = Math.max(...waterLevels);
    const minLevel = Math.min(...waterLevels);
    
    // Obliczenia statystyczne dla modelowania ryzyka
    const variance = waterLevels.reduce((sum, level) => {
      return sum + Math.pow(level - avgLevel, 2);
    }, 0) / waterLevels.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Percentyle dla analizy ryzyka
    const sortedLevels = [...waterLevels].sort((a, b) => a - b);
    const p95 = sortedLevels[Math.floor(sortedLevels.length * 0.95)];
    const p99 = sortedLevels[Math.floor(sortedLevels.length * 0.99)];
    
    // Współczynnik zmienności
    const coefficientOfVariation = avgLevel > 0 ? (standardDeviation / avgLevel) * 100 : 0;
    
    // Prawdopodobieństwo przekroczenia poziomów krytycznych
    let exceedanceProb = 0;
    if (station.warningLevel) {
      const exceedances = waterLevels.filter(level => level > station.warningLevel).length;
      exceedanceProb = (exceedances / waterLevels.length) * 100;
    }
    
    // Klasyfikacja ryzyka powodziowego
    let riskLevel = 'Niskie';
    let riskScore = 0;
    
    if (coefficientOfVariation > 50) riskScore += 3;
    else if (coefficientOfVariation > 30) riskScore += 2;
    else if (coefficientOfVariation > 15) riskScore += 1;
    
    if (exceedanceProb > 20) riskScore += 3;
    else if (exceedanceProb > 10) riskScore += 2;
    else if (exceedanceProb > 5) riskScore += 1;
    
    if (maxLevel > avgLevel * 2) riskScore += 2;
    if (station.alarmLevel && maxLevel > station.alarmLevel) riskScore += 3;
    
    if (riskScore >= 7) riskLevel = 'Bardzo wysokie';
    else if (riskScore >= 5) riskLevel = 'Wysokie';
    else if (riskScore >= 3) riskLevel = 'Średnie';
    
    // Trend zmian (uproszczony)
    const recentLevels = waterLevels.slice(-5);
    const trend = recentLevels.length > 1 ? 
      (recentLevels[recentLevels.length - 1] - recentLevels[0]) / recentLevels.length : 0;
    
    const assessment = {
      stationId,
      stationName: station.stationName,
      river: station.riverName || 'Nieznana',
      voivodeship: station.voivodeship || 'Nieznane',
      latitude: station.latitude,
      longitude: station.longitude,
      avgLevel,
      maxLevel,
      minLevel,
      standardDeviation,
      coefficientOfVariation,
      p95Level: p95,
      p99Level: p99,
      exceedanceProb,
      riskLevel,
      riskScore,
      trend,
      warningLevel: station.warningLevel,
      alarmLevel: station.alarmLevel,
      returnPeriod: exceedanceProb > 0 ? Math.round(100 / exceedanceProb) : null,
      floodPotential: maxLevel > avgLevel * 1.5 ? 'Wysokie' : maxLevel > avgLevel * 1.2 ? 'Średnie' : 'Niskie'
    };
    
    riskAssessments.push(assessment);
    
    // Grupowanie według województw dla analizy regionalnej
    const voivodeship = station.voivodeship || 'Nieznane';
    if (!regionalRisk.has(voivodeship)) {
      regionalRisk.set(voivodeship, []);
    }
    const regionalGroup = regionalRisk.get(voivodeship);
    if (regionalGroup) {
      regionalGroup.push(assessment);
    }
  }

  // Analiza regionalna ryzyka
  const regionalAnalysis = Array.from(regionalRisk.entries()).map(([voivodeship, assessments]) => {
    const highRiskStations = assessments.filter(a => ['Wysokie', 'Bardzo wysokie'].includes(a.riskLevel)).length;
    const avgRiskScore = assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length;
    const maxExceedanceProb = Math.max(...assessments.map(a => a.exceedanceProb));
    
    return {
      voivodeship,
      totalStations: assessments.length,
      highRiskStations,
      riskPercentage: (highRiskStations / assessments.length) * 100,
      avgRiskScore,
      maxExceedanceProb,
      regionalRiskLevel: avgRiskScore >= 5 ? 'Wysokie' : avgRiskScore >= 3 ? 'Średnie' : 'Niskie'
    };
  });

  return {
    stationAssessments: riskAssessments.sort((a, b) => b.riskScore - a.riskScore),
    regionalAnalysis: regionalAnalysis.sort((a, b) => b.avgRiskScore - a.avgRiskScore),
    summary: {
      totalStations: riskAssessments.length,
      highRiskStations: riskAssessments.filter(a => ['Wysokie', 'Bardzo wysokie'].includes(a.riskLevel)).length,
      avgExceedanceProb: riskAssessments.reduce((sum, a) => sum + a.exceedanceProb, 0) / riskAssessments.length,
      stationsAboveWarning: riskAssessments.filter(a => a.exceedanceProb > 10).length
    }
  };
}

// System wczesnego ostrzegania i predykcji
function generateEarlyWarningSystem(measurements: any[]) {
  const stationGroups = new Map<string, any[]>();
  
  measurements.forEach(measurement => {
    const stationId = measurement.stationId;
    if (!stationGroups.has(stationId)) {
      stationGroups.set(stationId, []);
    }
    const stationGroup = stationGroups.get(stationId);
    if (stationGroup) {
      stationGroup.push(measurement);
    }
  });

  const alerts = [];
  const predictions = [];
  const monitoringStations = [];

  for (const [stationId, stationMeasurements] of stationGroups.entries()) {
    const station = stationMeasurements[0].station;
    const waterLevels = stationMeasurements
      .filter(m => m.waterLevel !== null)
      .sort((a, b) => a.measurementTimestamp.getTime() - b.measurementTimestamp.getTime())
      .map(m => ({ level: m.waterLevel, timestamp: m.measurementTimestamp }));

    if (waterLevels.length < 5) continue;

    const currentLevel = waterLevels[waterLevels.length - 1].level;
    const previousLevel = waterLevels[waterLevels.length - 2]?.level || currentLevel;
    const change24h = waterLevels.length >= 24 ? currentLevel - waterLevels[waterLevels.length - 24].level : 0;
    
    // Trend analizy (ostatnie 5 pomiarów)
    const recentLevels = waterLevels.slice(-5).map(w => w.level);
    const trendSlope = calculateTrend(recentLevels);
    
    // Predykcja na następne 6-12 godzin (uproszczona)
    const predicted6h = currentLevel + (trendSlope * 6);
    const predicted12h = currentLevel + (trendSlope * 12);
    const predicted24h = currentLevel + (trendSlope * 24);
    
    // Generowanie alertów
    let alertLevel = 'Brak';
    let alertMessage = '';
    let alertPriority = 0;
    
    if (station.alarmLevel && currentLevel > station.alarmLevel) {
      alertLevel = 'ALARM';
      alertMessage = 'Przekroczony poziom alarmowy!';
      alertPriority = 4;
    } else if (station.warningLevel && currentLevel > station.warningLevel) {
      alertLevel = 'OSTRZEŻENIE';
      alertMessage = 'Przekroczony poziom ostrzegawczy!';
      alertPriority = 3;
    } else if (station.warningLevel && predicted12h > station.warningLevel) {
      alertLevel = 'UWAGA';
      alertMessage = 'Przewidywane przekroczenie poziomu ostrzegawczego w ciągu 12h';
      alertPriority = 2;
    } else if (trendSlope > 5) {
      alertLevel = 'INFORMACJA';
      alertMessage = 'Szybki wzrost poziomu wody';
      alertPriority = 1;
    }
    
    // Ocena wiarygodności predykcji
    const levelVariability = Math.sqrt(recentLevels.reduce((sum, level) => {
      const avg = recentLevels.reduce((s, l) => s + l, 0) / recentLevels.length;
      return sum + Math.pow(level - avg, 2);
    }, 0) / recentLevels.length);
    
    const predictionConfidence = levelVariability < 10 ? 'Wysoka' : 
                                levelVariability < 25 ? 'Średnia' : 'Niska';
    
    if (alertLevel !== 'Brak') {
      alerts.push({
        stationId,
        stationName: station.stationName,
        river: station.riverName || 'Nieznana',
        voivodeship: station.voivodeship || 'Nieznane',
        alertLevel,
        alertMessage,
        alertPriority,
        currentLevel,
        warningLevel: station.warningLevel,
        alarmLevel: station.alarmLevel,
        trend: trendSlope > 2 ? 'Rosnący' : trendSlope < -2 ? 'Malejący' : 'Stabilny',
        change24h,
        timestamp: new Date().toISOString()
      });
    }
    
    predictions.push({
      stationId,
      stationName: station.stationName,
      river: station.riverName || 'Nieznana',
      currentLevel,
      predicted6h,
      predicted12h,
      predicted24h,
      trendSlope,
      predictionConfidence,
      riskLevel: alertPriority >= 3 ? 'Wysokie' : alertPriority >= 2 ? 'Średnie' : 'Niskie'
    });
    
    // Stacje monitoringowe (kluczowe punkty)
    const isMonitoringStation = station.warningLevel && station.alarmLevel && 
                               (alertPriority >= 2 || Math.abs(trendSlope) > 3);
    
    if (isMonitoringStation) {
      monitoringStations.push({
        stationId,
        stationName: station.stationName,
        river: station.riverName || 'Nieznana',
        voivodeship: station.voivodeship || 'Nieznane',
        latitude: station.latitude,
        longitude: station.longitude,
        currentLevel,
        warningLevel: station.warningLevel,
        alarmLevel: station.alarmLevel,
        status: alertLevel,
        trend: trendSlope > 2 ? 'Rosnący' : trendSlope < -2 ? 'Malejący' : 'Stabilny',
        priority: alertPriority,
        lastUpdate: new Date().toISOString()
      });
    }
  }

  return {
    activeAlerts: alerts.sort((a, b) => b.alertPriority - a.alertPriority),
    predictions: predictions.slice(0, 20), // Top 20 predykcji
    monitoringStations: monitoringStations.sort((a, b) => b.priority - a.priority),
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.alertPriority >= 3).length,
      stationsMonitored: monitoringStations.length,
      avgTrend: predictions.reduce((sum, p) => sum + p.trendSlope, 0) / predictions.length,
      highRiskPredictions: predictions.filter(p => p.riskLevel === 'Wysokie').length
    }
  };
}

// Funkcja pomocnicza do obliczania trendu
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // suma indeksów 0,1,2...n-1
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
  const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope || 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const river = searchParams.get('river') || 'all';

    // Oblicz datę początkową na podstawie okresu
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Pobierz pomiary z wybranego okresu
    const whereClause: any = {
      measurementTimestamp: {
        gte: startDate
      }
    };

    // Filtruj po rzece jeśli wybrana
    if (river !== 'all') {
      whereClause.station = {
        riverName: {
          contains: river,
          mode: 'insensitive'
        }
      };
    }

    const measurements = await prisma.measurement.findMany({
      where: whereClause,
      include: {
        station: true
      },
      orderBy: {
        measurementTimestamp: 'desc'
      }
    });

    if (measurements.length === 0) {
      return NextResponse.json({
        status: 'success',
        data: {
          overview: {
            totalMeasurements: 0,
            activeStations: 0,
            averageWaterLevel: 0,
            globalMinLevel: 0,
            globalMaxLevel: 0,
            globalRange: 0,
            globalStandardDeviation: 0
          },
          riverStats: [],
          monthlyStats: [],
          stationStats: [],
          voivodeshipStats: []
        },
        timestamp: new Date().toISOString()
      });
    }

    // Oblicz statystyki ogólne
    const waterLevels = measurements
      .filter(m => m.waterLevel !== null)
      .map(m => m.waterLevel!);

    const totalMeasurements = measurements.length;
    const activeStations = new Set(measurements.map(m => m.stationId)).size;
    const averageWaterLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
    const globalMinLevel = Math.min(...waterLevels);
    const globalMaxLevel = Math.max(...waterLevels);
    const globalRange = globalMaxLevel - globalMinLevel;

    // Oblicz odchylenie standardowe
    const variance = waterLevels.reduce((sum, level) => {
      return sum + Math.pow(level - averageWaterLevel, 2);
    }, 0) / waterLevels.length;
    const globalStandardDeviation = Math.sqrt(variance);

    // Grupuj pomiary według rzek
    const riverGroups = new Map<string, typeof measurements>();
    measurements.forEach(measurement => {
      const riverName = measurement.station.riverName || 'Nieznana';
      if (!riverGroups.has(riverName)) {
        riverGroups.set(riverName, []);
      }
      const riverGroup = riverGroups.get(riverName);
      if (riverGroup) {
        riverGroup.push(measurement);
      }
    });

    // Oblicz statystyki dla rzek
    const riverStats = Array.from(riverGroups.entries()).map(([riverName, riverMeasurements]) => {
      const riverWaterLevels = riverMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel!);

      if (riverWaterLevels.length === 0) {
        return {
          river: riverName,
          stationCount: new Set(riverMeasurements.map(m => m.stationId)).size,
          averageLevel: 0,
          minLevel: 0,
          maxLevel: 0,
          range: 0,
          standardDeviation: 0,
          variance: 0,
          trend: 'stable' as const
        };
      }

      const riverAverage = riverWaterLevels.reduce((sum, level) => sum + level, 0) / riverWaterLevels.length;
      const riverMin = Math.min(...riverWaterLevels);
      const riverMax = Math.max(...riverWaterLevels);
      const riverRange = riverMax - riverMin;

      const riverVariance = riverWaterLevels.reduce((sum, level) => {
        return sum + Math.pow(level - riverAverage, 2);
      }, 0) / riverWaterLevels.length;
      const riverStandardDeviation = Math.sqrt(riverVariance);

      // Oblicz trend (uproszczony - porównanie pierwszej i ostatniej połowy pomiarów)
      const sortedByTime = riverMeasurements
        .filter(m => m.waterLevel !== null)
        .sort((a, b) => a.measurementTimestamp.getTime() - b.measurementTimestamp.getTime());
      
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (sortedByTime.length >= 4) {
        const firstHalf = sortedByTime.slice(0, Math.floor(sortedByTime.length / 2));
        const secondHalf = sortedByTime.slice(Math.floor(sortedByTime.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, m) => sum + m.waterLevel!, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, m) => sum + m.waterLevel!, 0) / secondHalf.length;
        
        const difference = secondAvg - firstAvg;
        if (Math.abs(difference) > riverStandardDeviation * 0.5) {
          trend = difference > 0 ? 'rising' : 'falling';
        }
      }

      return {
        river: riverName,
        stationCount: new Set(riverMeasurements.map(m => m.stationId)).size,
        averageLevel: riverAverage,
        minLevel: riverMin,
        maxLevel: riverMax,
        range: riverRange,
        standardDeviation: riverStandardDeviation,
        variance: riverVariance,
        trend
      };
    }).sort((a, b) => b.stationCount - a.stationCount);

    // Grupuj pomiary według stacji
    const stationGroups = new Map<string, typeof measurements>();
    measurements.forEach(measurement => {
      const stationId = measurement.stationId;
      if (!stationGroups.has(stationId)) {
        stationGroups.set(stationId, []);
      }
      const stationGroup = stationGroups.get(stationId);
      if (stationGroup) {
        stationGroup.push(measurement);
      }
    });

    // Oblicz statystyki dla stacji
    const stationStats = Array.from(stationGroups.entries()).map(([stationId, stationMeasurements]) => {
      const station = stationMeasurements[0].station;
      const stationWaterLevels = stationMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel!);

      if (stationWaterLevels.length === 0) {
        return {
          stationId,
          stationName: station.stationName,
          river: station.riverName || 'Nieznana',
          voivodeship: station.voivodeship || 'Nieznane',
          averageLevel: 0,
          minLevel: 0,
          maxLevel: 0,
          range: 0,
          measurementCount: stationMeasurements.length,
          lastMeasurement: stationMeasurements[0].measurementTimestamp.toISOString(),
          stability: 'stable' as const
        };
      }

      const stationAverage = stationWaterLevels.reduce((sum, level) => sum + level, 0) / stationWaterLevels.length;
      const stationMin = Math.min(...stationWaterLevels);
      const stationMax = Math.max(...stationWaterLevels);
      const stationRange = stationMax - stationMin;

      const stationVariance = stationWaterLevels.reduce((sum, level) => {
        return sum + Math.pow(level - stationAverage, 2);
      }, 0) / stationWaterLevels.length;
      const stationStandardDeviation = Math.sqrt(stationVariance);

      // Określ stabilność na podstawie odchylenia standardowego
      let stability: 'stable' | 'variable' | 'highly_variable' = 'stable';
      if (stationStandardDeviation > stationAverage * 0.3) {
        stability = 'highly_variable';
      } else if (stationStandardDeviation > stationAverage * 0.15) {
        stability = 'variable';
      }

      return {
        stationId,
        stationName: station.stationName,
        river: station.riverName || 'Nieznana',
        voivodeship: station.voivodeship || 'Nieznane',
        averageLevel: stationAverage,
        minLevel: stationMin,
        maxLevel: stationMax,
        range: stationRange,
        measurementCount: stationMeasurements.length,
        lastMeasurement: stationMeasurements[0].measurementTimestamp.toISOString(),
        stability
      };
    });

    // Grupuj pomiary według województw
    const voivodeshipGroups = new Map<string, typeof measurements>();
    measurements.forEach(measurement => {
      const voivodeship = measurement.station.voivodeship || 'Nieznane';
      if (!voivodeshipGroups.has(voivodeship)) {
        voivodeshipGroups.set(voivodeship, []);
      }
      const voivGroup = voivodeshipGroups.get(voivodeship);
      if (voivGroup) {
        voivGroup.push(measurement);
      }
    });

    // Oblicz statystyki dla województw
    const voivodeshipStats = Array.from(voivodeshipGroups.entries()).map(([voivodeship, voivMeasurements]) => {
      const voivWaterLevels = voivMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel!);

      const voivAverage = voivWaterLevels.length > 0 
        ? voivWaterLevels.reduce((sum, level) => sum + level, 0) / voivWaterLevels.length 
        : 0;
      const voivMin = voivWaterLevels.length > 0 ? Math.min(...voivWaterLevels) : 0;
      const voivMax = voivWaterLevels.length > 0 ? Math.max(...voivWaterLevels) : 0;
      const voivRange = voivMax - voivMin;

      return {
        voivodeship,
        stationCount: new Set(voivMeasurements.map(m => m.stationId)).size,
        averageLevel: voivAverage,
        range: voivRange
      };
    });

    // Statystyki miesięczne (uproszczone - ostatnie 12 miesięcy)
    const monthlyStats = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthMeasurements = measurements.filter(m => 
        m.measurementTimestamp >= monthStart && m.measurementTimestamp < monthEnd
      );

      const monthWaterLevels = monthMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel!);

      const monthAverage = monthWaterLevels.length > 0 
        ? monthWaterLevels.reduce((sum, level) => sum + level, 0) / monthWaterLevels.length 
        : 0;
      const monthMin = monthWaterLevels.length > 0 ? Math.min(...monthWaterLevels) : 0;
      const monthMax = monthWaterLevels.length > 0 ? Math.max(...monthWaterLevels) : 0;

      monthlyStats.push({
        month: monthStart.toLocaleDateString('pl-PL', { month: 'long' }),
        year: monthStart.getFullYear(),
        averageLevel: monthAverage,
        minLevel: monthMin,
        maxLevel: monthMax,
        measurementCount: monthMeasurements.length,
        stationsActive: new Set(monthMeasurements.map(m => m.stationId)).size
      });
    }

    // Analizy przestrzenne
    const spatialAnalysis = await generateSpatialAnalysis(measurements);
    
    // Zastosowania praktyczne
    const practicalApplications = await generatePracticalApplications(measurements);

    return NextResponse.json({
      status: 'success',
      data: {
        overview: {
          totalMeasurements,
          activeStations,
          averageWaterLevel,
          globalMinLevel,
          globalMaxLevel,
          globalRange,
          globalStandardDeviation
        },
        riverStats,
        monthlyStats,
        stationStats,
        voivodeshipStats,
        spatialAnalysis,
        practicalApplications
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting detailed stats:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get detailed statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 