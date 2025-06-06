'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Waves, 
  Calendar,
  MapPin,
  Target,
  Zap,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface WaterLevelStats {
  river: string;
  stationCount: number;
  averageLevel: number;
  minLevel: number;
  maxLevel: number;
  range: number;
  standardDeviation: number;
  variance: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface MonthlyStats {
  month: string;
  year: number;
  averageLevel: number;
  minLevel: number;
  maxLevel: number;
  measurementCount: number;
  stationsActive: number;
}

interface StationStats {
  stationId: string;
  stationName: string;
  river: string;
  voivodeship: string;
  averageLevel: number;
  minLevel: number;
  maxLevel: number;
  range: number;
  measurementCount: number;
  lastMeasurement: string;
  stability: 'stable' | 'variable' | 'highly_variable';
}

interface SpatialAnalysis {
  riverFlowAnalysis: {
    river: string;
    stationCount: number;
    stations: { name: string; avgLevel: number; range: number; }[];
    flowPattern: {
      upstreamStation: string;
      downstreamStation: string;
      correlation: number;
      distance: number;
      avgLevelDifference: number;
    }[];
    totalRange: number;
  }[];
  basinAnalysis: {
    basin: string;
    stationCount: number;
    riverCount: number;
    avgLevel: number;
    minLevel: number;
    maxLevel: number;
    range: number;
    standardDeviation: number;
    fluctuationIndex: number;
  }[];
  criticalPoints: {
    stationId: string;
    stationName: string;
    river: string;
    voivodeship: string;
    latitude: number | null;
    longitude: number | null;
    avgLevel: number;
    maxLevel: number;
    minLevel: number;
    range: number;
    standardDeviation: number;
    criticalityScore: number;
    reasons: string[];
    warningLevel: number | null;
    alarmLevel: number | null;
    riskLevel: string;
  }[];
}

interface PracticalApplications {
  floodRiskModeling: {
    stationAssessments: {
      stationId: string;
      stationName: string;
      river: string;
      voivodeship: string;
      latitude: number | null;
      longitude: number | null;
      avgLevel: number;
      maxLevel: number;
      minLevel: number;
      standardDeviation: number;
      coefficientOfVariation: number;
      p95Level: number;
      p99Level: number;
      exceedanceProb: number;
      riskLevel: string;
      riskScore: number;
      trend: number;
      warningLevel: number | null;
      alarmLevel: number | null;
      returnPeriod: number | null;
      floodPotential: string;
    }[];
    regionalAnalysis: {
      voivodeship: string;
      totalStations: number;
      highRiskStations: number;
      riskPercentage: number;
      avgRiskScore: number;
      maxExceedanceProb: number;
      regionalRiskLevel: string;
    }[];
    summary: {
      totalStations: number;
      highRiskStations: number;
      avgExceedanceProb: number;
      stationsAboveWarning: number;
    };
  };
  earlyWarningSystem: {
    activeAlerts: {
      stationId: string;
      stationName: string;
      river: string;
      voivodeship: string;
      alertLevel: string;
      alertMessage: string;
      alertPriority: number;
      currentLevel: number;
      warningLevel: number | null;
      alarmLevel: number | null;
      trend: string;
      change24h: number;
      timestamp: string;
    }[];
    predictions: {
      stationId: string;
      stationName: string;
      river: string;
      currentLevel: number;
      predicted6h: number;
      predicted12h: number;
      predicted24h: number;
      trendSlope: number;
      predictionConfidence: string;
      riskLevel: string;
    }[];
    monitoringStations: {
      stationId: string;
      stationName: string;
      river: string;
      voivodeship: string;
      latitude: number | null;
      longitude: number | null;
      currentLevel: number;
      warningLevel: number | null;
      alarmLevel: number | null;
      status: string;
      trend: string;
      priority: number;
      lastUpdate: string;
    }[];
    summary: {
      totalAlerts: number;
      criticalAlerts: number;
      stationsMonitored: number;
      avgTrend: number;
      highRiskPredictions: number;
    };
  };
}

interface StatsData {
  overview: {
    totalMeasurements: number;
    activeStations: number;
    averageWaterLevel: number;
    globalMinLevel: number;
    globalMaxLevel: number;
    globalRange: number;
    globalStandardDeviation: number;
  };
  riverStats: WaterLevelStats[];
  monthlyStats: MonthlyStats[];
  stationStats: StationStats[];
  voivodeshipStats: {
    voivodeship: string;
    stationCount: number;
    averageLevel: number;
    range: number;
  }[];
  spatialAnalysis: SpatialAnalysis;
  practicalApplications: PracticalApplications;
}

export default function StatsPage() {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedRiver, setSelectedRiver] = useState<string>('all');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/stats/detailed?period=${selectedPeriod}&river=${selectedRiver}`);
      if (!response.ok) {
        throw new Error('Błąd pobierania statystyk');
      }
      
      const data = await response.json();
      setStatsData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod, selectedRiver]);

  const formatNumber = (num: number | null | undefined, decimals: number = 1): string => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    return num.toFixed(decimals);
  };

  const getStabilityColor = (stability: string) => {
    switch (stability) {
      case 'stable': return 'success';
      case 'variable': return 'warning';
      case 'highly_variable': return 'error';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'falling': return <TrendingDown className="w-4 h-4 text-blue-500" />;
      case 'stable': return <Activity className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Wysokie': return 'error';
      case 'Średnie': return 'warning';
      case 'Niskie': return 'success';
      default: return 'default';
    }
  };

  const getAlertColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'ALARM': return 'error';
      case 'OSTRZEŻENIE': return 'warning';
      case 'UWAGA': return 'warning';
      case 'INFORMACJA': return 'default';
      default: return 'default';
    }
  };

  const getFloodRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Bardzo wysokie': return 'error';
      case 'Wysokie': return 'error';
      case 'Średnie': return 'warning';
      case 'Niskie': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Ładowanie statystyk...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Błąd: {error}</p>
              <Button onClick={fetchStats} variant="outline">
                Spróbuj ponownie
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Brak danych do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Statystyki Hydrologiczne
        </h1>
        <p className="text-gray-600">
          Zaawansowane analizy danych z polskich stacji hydrologicznych
        </p>
      </div>

      {/* Filtry */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Okres:</span>
          <div className="flex gap-1">
            {[
              { value: '7d', label: '7 dni' },
              { value: '30d', label: '30 dni' },
              { value: '90d', label: '90 dni' },
              { value: '1y', label: '1 rok' }
            ].map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value as any)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Rzeka:</span>
          <select
            value={selectedRiver}
            onChange={(e) => setSelectedRiver(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Wszystkie rzeki</option>
            {statsData.riverStats.slice(0, 10).map((river) => (
              <option key={river.river} value={river.river}>
                {river.river} ({river.stationCount} stacji)
              </option>
            ))}
          </select>
        </div>

        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Odśwież
        </Button>
      </div>

      {/* Statystyki ogólne */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Średni poziom wody
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(statsData.overview.averageWaterLevel)} cm
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Na podstawie {statsData.overview.totalMeasurements.toLocaleString()} pomiarów
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Zakres zmienności
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(statsData.overview.globalRange)} cm
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Min: {formatNumber(statsData.overview.globalMinLevel)} cm, 
              Max: {formatNumber(statsData.overview.globalMaxLevel)} cm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Odchylenie standardowe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(statsData.overview.globalStandardDeviation)} cm
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Miara niestabilności poziomów
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Aktywne stacje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsData.overview.activeStations}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Stacje z pomiarami w wybranym okresie
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statystyki rzek */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Waves className="w-5 h-5 mr-2" />
            Statystyki według rzek
          </CardTitle>
          <CardDescription>
            Analiza poziomów wody w głównych rzekach Polski
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Rzeka</th>
                  <th className="text-right py-2">Stacje</th>
                  <th className="text-right py-2">Średni poziom</th>
                  <th className="text-right py-2">Min / Max</th>
                  <th className="text-right py-2">Zakres</th>
                  <th className="text-right py-2">Odch. std.</th>
                  <th className="text-center py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {statsData.riverStats.slice(0, 10).map((river) => (
                  <tr key={river.river} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{river.river}</td>
                    <td className="text-right py-2">{river.stationCount}</td>
                    <td className="text-right py-2">{formatNumber(river.averageLevel)} cm</td>
                    <td className="text-right py-2 text-xs">
                      {formatNumber(river.minLevel)} / {formatNumber(river.maxLevel)} cm
                    </td>
                    <td className="text-right py-2">{formatNumber(river.range)} cm</td>
                    <td className="text-right py-2">{formatNumber(river.standardDeviation)} cm</td>
                    <td className="text-center py-2">
                      {getTrendIcon(river.trend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Statystyki stacji */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Najbardziej zmienne stacje
          </CardTitle>
          <CardDescription>
            Stacje z największą zmiennością poziomów wody
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Stacja</th>
                  <th className="text-left py-2">Rzeka</th>
                  <th className="text-left py-2">Województwo</th>
                  <th className="text-right py-2">Średni poziom</th>
                  <th className="text-right py-2">Zakres</th>
                  <th className="text-right py-2">Pomiary</th>
                  <th className="text-center py-2">Stabilność</th>
                </tr>
              </thead>
              <tbody>
                {statsData.stationStats
                  .sort((a, b) => b.range - a.range)
                  .slice(0, 15)
                  .map((station) => (
                  <tr key={station.stationId} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{station.stationName}</td>
                    <td className="py-2">{station.river}</td>
                    <td className="py-2 text-xs">{station.voivodeship}</td>
                    <td className="text-right py-2">{formatNumber(station.averageLevel)} cm</td>
                    <td className="text-right py-2">{formatNumber(station.range)} cm</td>
                    <td className="text-right py-2">{station.measurementCount}</td>
                    <td className="text-center py-2">
                      <Badge variant={getStabilityColor(station.stability) as any}>
                        {station.stability === 'stable' ? 'Stabilna' : 
                         station.stability === 'variable' ? 'Zmienna' : 'Bardzo zmienna'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Statystyki województw */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Statystyki według województw
          </CardTitle>
          <CardDescription>
            Porównanie poziomów wody w różnych regionach Polski
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsData.voivodeshipStats
              .sort((a, b) => b.stationCount - a.stationCount)
              .map((voivodeship) => (
              <div key={voivodeship.voivodeship} className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {voivodeship.voivodeship}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stacje:</span>
                    <span className="font-medium">{voivodeship.stationCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Średni poziom:</span>
                    <span className="font-medium">{formatNumber(voivodeship.averageLevel)} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zakres:</span>
                    <span className="font-medium">{formatNumber(voivodeship.range)} cm</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ANALIZY PRZESTRZENNE */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🗺️ Analizy Przestrzenne
        </h2>
        <p className="text-gray-600 mb-6">
          Zaawansowane analizy przepływu wody, dorzeczy i krytycznych punktów w systemie rzecznym
        </p>
      </div>

      {/* Analiza dorzeczy */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Waves className="w-5 h-5 mr-2" />
            Analiza dorzeczy - fluktuacje poziomów
          </CardTitle>
          <CardDescription>
            Porównanie dorzeczy pod kątem zmienności poziomów wody
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Dorzecze</th>
                  <th className="text-right py-2">Stacje</th>
                  <th className="text-right py-2">Rzeki</th>
                  <th className="text-right py-2">Średni poziom</th>
                  <th className="text-right py-2">Zakres</th>
                  <th className="text-right py-2">Odch. std.</th>
                  <th className="text-right py-2">Indeks fluktuacji</th>
                </tr>
              </thead>
              <tbody>
                {statsData.spatialAnalysis.basinAnalysis.map((basin) => (
                  <tr key={basin.basin} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{basin.basin}</td>
                    <td className="text-right py-2">{basin.stationCount}</td>
                    <td className="text-right py-2">{basin.riverCount}</td>
                    <td className="text-right py-2">{formatNumber(basin.avgLevel)} cm</td>
                    <td className="text-right py-2">{formatNumber(basin.range)} cm</td>
                    <td className="text-right py-2">{formatNumber(basin.standardDeviation)} cm</td>
                    <td className="text-right py-2">
                      <span className={`font-medium ${
                        basin.fluctuationIndex > 50 ? 'text-red-600' :
                        basin.fluctuationIndex > 30 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {formatNumber(basin.fluctuationIndex)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Przepływ fal przez rzeki */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Przepływ fal przez stacje na rzekach
          </CardTitle>
          <CardDescription>
            Analiza korelacji między stacjami na tej samej rzece
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {statsData.spatialAnalysis.riverFlowAnalysis.slice(0, 5).map((river) => (
              <div key={river.river} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-900">{river.river}</h4>
                  <div className="text-sm text-gray-500">
                    {river.stationCount} stacji • Zakres: {formatNumber(river.totalRange)} cm
                  </div>
                </div>
                
                {river.flowPattern.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Przepływ między stacjami:</h5>
                    {river.flowPattern.map((flow, index) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                        <div className="flex items-center">
                          <span className="font-medium">{flow.upstreamStation}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{flow.downstreamStation}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Odległość: {formatNumber(flow.distance)} km</span>
                          <span>Różnica poziomów: {formatNumber(flow.avgLevelDifference, 1)} cm</span>
                          <span className={`font-medium ${
                            flow.correlation > 0.7 ? 'text-green-600' :
                            flow.correlation > 0.4 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            Korelacja: {formatNumber(flow.correlation * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Krytyczne punkty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Krytyczne punkty w systemie rzecznym
          </CardTitle>
          <CardDescription>
            Stacje o wysokim ryzyku powodzi lub problemów hydrologicznych
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Stacja</th>
                  <th className="text-left py-2">Rzeka</th>
                  <th className="text-left py-2">Województwo</th>
                  <th className="text-right py-2">Średni poziom</th>
                  <th className="text-right py-2">Zakres</th>
                  <th className="text-right py-2">Punkty ryzyka</th>
                  <th className="text-center py-2">Poziom ryzyka</th>
                  <th className="text-left py-2">Przyczyny</th>
                </tr>
              </thead>
              <tbody>
                {statsData.spatialAnalysis.criticalPoints.slice(0, 15).map((point) => (
                  <tr key={point.stationId} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{point.stationName}</td>
                    <td className="py-2">{point.river}</td>
                    <td className="py-2 text-xs">{point.voivodeship}</td>
                    <td className="text-right py-2">{formatNumber(point.avgLevel)} cm</td>
                    <td className="text-right py-2">{formatNumber(point.range)} cm</td>
                    <td className="text-right py-2 font-medium">{point.criticalityScore}</td>
                    <td className="text-center py-2">
                      <Badge variant={getRiskColor(point.riskLevel) as any}>
                        {point.riskLevel}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs">
                      <div className="max-w-xs">
                        {point.reasons.slice(0, 2).join(', ')}
                        {point.reasons.length > 2 && '...'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {statsData.spatialAnalysis.criticalPoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Brak krytycznych punktów w wybranym okresie</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ZASTOSOWANIA PRAKTYCZNE */}
      <div className="mb-8 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🚨 Zastosowania Praktyczne
        </h2>
        <p className="text-gray-600 mb-6">
          Modelowanie ryzyka powodziowego i systemy wczesnego ostrzegania
        </p>
      </div>

      {/* Modelowanie ryzyka powodziowego */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Modelowanie ryzyka powodziowego
          </CardTitle>
          <CardDescription>
            Analiza prawdopodobieństwa wystąpienia powodzi i ocena ryzyka dla poszczególnych stacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Podsumowanie ryzyka */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {statsData.practicalApplications.floodRiskModeling.summary.totalStations}
              </div>
              <div className="text-sm text-blue-800">Stacje analizowane</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {statsData.practicalApplications.floodRiskModeling.summary.highRiskStations}
              </div>
              <div className="text-sm text-red-800">Stacje wysokiego ryzyka</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatNumber(statsData.practicalApplications.floodRiskModeling.summary.avgExceedanceProb)}%
              </div>
              <div className="text-sm text-orange-800">Średnie prawdopodobieństwo przekroczenia</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {statsData.practicalApplications.floodRiskModeling.summary.stationsAboveWarning}
              </div>
              <div className="text-sm text-yellow-800">Stacje powyżej poziomu ostrzegawczego</div>
            </div>
          </div>

          {/* Analiza regionalna ryzyka */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Analiza regionalna ryzyka</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Województwo</th>
                    <th className="text-right py-2">Stacje</th>
                    <th className="text-right py-2">Wysokie ryzyko</th>
                    <th className="text-right py-2">% ryzyka</th>
                    <th className="text-right py-2">Średni wynik</th>
                    <th className="text-center py-2">Poziom regionalny</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.practicalApplications.floodRiskModeling.regionalAnalysis.slice(0, 10).map((region) => (
                    <tr key={region.voivodeship} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{region.voivodeship}</td>
                      <td className="text-right py-2">{region.totalStations}</td>
                      <td className="text-right py-2">{region.highRiskStations}</td>
                      <td className="text-right py-2">{formatNumber(region.riskPercentage)}%</td>
                      <td className="text-right py-2">{formatNumber(region.avgRiskScore, 1)}</td>
                      <td className="text-center py-2">
                        <Badge variant={getFloodRiskColor(region.regionalRiskLevel) as any}>
                          {region.regionalRiskLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top stacje wysokiego ryzyka */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Stacje najwyższego ryzyka powodziowego</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Stacja</th>
                    <th className="text-left py-2">Rzeka</th>
                    <th className="text-right py-2">Poziom obecny</th>
                    <th className="text-right py-2">P95</th>
                    <th className="text-right py-2">Prawdop. przekr.</th>
                    <th className="text-right py-2">Okres powrotu</th>
                    <th className="text-center py-2">Ryzyko</th>
                    <th className="text-center py-2">Potencjał</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.practicalApplications.floodRiskModeling.stationAssessments.slice(0, 15).map((assessment) => (
                    <tr key={assessment.stationId} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{assessment.stationName}</td>
                      <td className="py-2">{assessment.river}</td>
                      <td className="text-right py-2">{formatNumber(assessment.avgLevel)} cm</td>
                      <td className="text-right py-2">{formatNumber(assessment.p95Level)} cm</td>
                      <td className="text-right py-2">{formatNumber(assessment.exceedanceProb)}%</td>
                      <td className="text-right py-2">
                        {assessment.returnPeriod ? `${assessment.returnPeriod} lat` : 'N/A'}
                      </td>
                      <td className="text-center py-2">
                        <Badge variant={getFloodRiskColor(assessment.riskLevel) as any}>
                          {assessment.riskLevel}
                        </Badge>
                      </td>
                      <td className="text-center py-2">
                        <Badge variant={assessment.floodPotential === 'Wysokie' ? 'error' : 
                                      assessment.floodPotential === 'Średnie' ? 'warning' : 'success' as any}>
                          {assessment.floodPotential}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System wczesnego ostrzegania */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            System wczesnego ostrzegania i predykcji
          </CardTitle>
          <CardDescription>
            Aktywne alerty, predykcje poziomów wody i monitoring kluczowych stacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Podsumowanie alertów */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {statsData.practicalApplications.earlyWarningSystem.summary.totalAlerts}
              </div>
              <div className="text-sm text-red-800">Aktywne alerty</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {statsData.practicalApplications.earlyWarningSystem.summary.criticalAlerts}
              </div>
              <div className="text-sm text-orange-800">Alerty krytyczne</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {statsData.practicalApplications.earlyWarningSystem.summary.stationsMonitored}
              </div>
              <div className="text-sm text-blue-800">Stacje monitorowane</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {statsData.practicalApplications.earlyWarningSystem.summary.highRiskPredictions}
              </div>
              <div className="text-sm text-purple-800">Predykcje wysokiego ryzyka</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(statsData.practicalApplications.earlyWarningSystem.summary.avgTrend, 2)}
              </div>
              <div className="text-sm text-green-800">Średni trend (cm/h)</div>
            </div>
          </div>

          {/* Aktywne alerty */}
          {statsData.practicalApplications.earlyWarningSystem.activeAlerts.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">🚨 Aktywne alerty</h4>
              <div className="space-y-3">
                {statsData.practicalApplications.earlyWarningSystem.activeAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.stationId} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Badge variant={getAlertColor(alert.alertLevel) as any}>
                          {alert.alertLevel}
                        </Badge>
                        <span className="font-medium">{alert.stationName}</span>
                        <span className="text-sm text-gray-600">({alert.river})</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleString('pl-PL')}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">{alert.alertMessage}</div>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>Poziom: {formatNumber(alert.currentLevel)} cm</span>
                      {alert.warningLevel && (
                        <span>Ostrzeżenie: {alert.warningLevel} cm</span>
                      )}
                      {alert.alarmLevel && (
                        <span>Alarm: {alert.alarmLevel} cm</span>
                      )}
                      <span>Trend: {alert.trend}</span>
                      <span>Zmiana 24h: {formatNumber(alert.change24h, 1)} cm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predykcje */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-3">📈 Predykcje poziomów wody</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Stacja</th>
                    <th className="text-left py-2">Rzeka</th>
                    <th className="text-right py-2">Obecny</th>
                    <th className="text-right py-2">+6h</th>
                    <th className="text-right py-2">+12h</th>
                    <th className="text-right py-2">+24h</th>
                    <th className="text-right py-2">Trend</th>
                    <th className="text-center py-2">Pewność</th>
                    <th className="text-center py-2">Ryzyko</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.practicalApplications.earlyWarningSystem.predictions.slice(0, 15).map((prediction) => (
                    <tr key={prediction.stationId} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{prediction.stationName}</td>
                      <td className="py-2">{prediction.river}</td>
                      <td className="text-right py-2">{formatNumber(prediction.currentLevel)} cm</td>
                      <td className="text-right py-2">{formatNumber(prediction.predicted6h)} cm</td>
                      <td className="text-right py-2">{formatNumber(prediction.predicted12h)} cm</td>
                      <td className="text-right py-2">{formatNumber(prediction.predicted24h)} cm</td>
                      <td className="text-right py-2">
                        <span className={`font-medium ${
                          prediction.trendSlope > 2 ? 'text-red-600' :
                          prediction.trendSlope < -2 ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {formatNumber(prediction.trendSlope, 2)} cm/h
                        </span>
                      </td>
                      <td className="text-center py-2">
                        <Badge variant={prediction.predictionConfidence === 'Wysoka' ? 'success' :
                                      prediction.predictionConfidence === 'Średnia' ? 'warning' : 'error' as any}>
                          {prediction.predictionConfidence}
                        </Badge>
                      </td>
                      <td className="text-center py-2">
                        <Badge variant={getRiskColor(prediction.riskLevel) as any}>
                          {prediction.riskLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stacje monitoringowe */}
          {statsData.practicalApplications.earlyWarningSystem.monitoringStations.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">🎯 Kluczowe stacje monitoringowe</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statsData.practicalApplications.earlyWarningSystem.monitoringStations.slice(0, 9).map((station) => (
                  <div key={station.stationId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{station.stationName}</h5>
                      <Badge variant={getAlertColor(station.status) as any}>
                        {station.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{station.river}, {station.voivodeship}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Poziom:</span>
                        <span className="font-medium">{formatNumber(station.currentLevel)} cm</span>
                      </div>
                      {station.warningLevel && (
                        <div className="flex justify-between">
                          <span>Ostrzeżenie:</span>
                          <span>{station.warningLevel} cm</span>
                        </div>
                      )}
                      {station.alarmLevel && (
                        <div className="flex justify-between">
                          <span>Alarm:</span>
                          <span>{station.alarmLevel} cm</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Trend:</span>
                        <span className={`font-medium ${
                          station.trend === 'Rosnący' ? 'text-red-600' :
                          station.trend === 'Malejący' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {station.trend}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Priorytet:</span>
                        <span className="font-medium">{station.priority}/4</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brak alertów */}
          {statsData.practicalApplications.earlyWarningSystem.activeAlerts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Brak aktywnych alertów w systemie</p>
              <p className="text-sm">Wszystkie stacje działają w normalnych parametrach</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 