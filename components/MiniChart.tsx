'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MeasurementData {
  timestamp: string;
  waterLevel: number | null;
}

interface MiniChartProps {
  stationId: string;
  days?: number;
  height?: number;
  onTrendChange?: (trend: 'rising' | 'falling' | 'stable') => void;
}

export function MiniChart({ stationId, days = 7, height = 60, onTrendChange }: MiniChartProps) {
  const [data, setData] = useState<MeasurementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [stationId, days]);

  // Oblicz trend (zawsze, nawet gdy brak danych)
  const waterLevels = data.map(d => d.waterLevel).filter((level): level is number => level !== null && !isNaN(level));
  const firstLevel = waterLevels[0] ?? 0;
  const lastLevel = waterLevels[waterLevels.length - 1] ?? 0;
  const trend = waterLevels.length > 1 && lastLevel > firstLevel + 2 ? 'rising' : 
               waterLevels.length > 1 && lastLevel < firstLevel - 2 ? 'falling' : 'stable';

  // Powiadom o zmianie trendu (zawsze wywoływany)
  useEffect(() => {
    if (onTrendChange && !loading && !error && data.length > 0) {
      onTrendChange(trend);
    }
  }, [trend, onTrendChange, loading, error, data.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/stations/${stationId}/measurements?days=${days}&limit=100`);
      const result = await response.json();
      
      if (result.status === 'success' && result.data.measurements) {
        // Filtruj tylko pomiary z poziomem wody i sortuj chronologicznie
        const validMeasurements = result.data.measurements
          .filter((m: any) => m.waterLevel !== null)
          .reverse() // Odwróć aby mieć chronologicznie
          .slice(-50); // Weź ostatnie 50 pomiarów
        
        setData(validMeasurements);
      } else {
        setError('Brak danych');
      }
    } catch (err) {
      setError('Błąd ładowania');
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-gray-100 rounded animate-pulse" style={{ height }}>
        <div className="flex items-center justify-center h-full text-xs text-gray-500">
          Ładowanie...
        </div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full text-xs text-gray-500">
          {error || 'Brak danych'}
        </div>
      </div>
    );
  }

  // Oblicz min/max dla skalowania
  const validWaterLevels = waterLevels.filter(level => level !== null && !isNaN(level));
  
  if (validWaterLevels.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded border border-gray-200" style={{ height }}>
        <div className="flex items-center justify-center h-full text-xs text-gray-500">
          Brak danych
        </div>
      </div>
    );
  }

  const minLevel = Math.min(...validWaterLevels);
  const maxLevel = Math.max(...validWaterLevels);
  const range = maxLevel - minLevel || 1; // Unikaj dzielenia przez 0

  // Generuj punkty SVG
  const width = 200;
  const padding = 4;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const points = data.map((point, index) => {
    if (point.waterLevel === null || isNaN(point.waterLevel)) return null;
    const x = padding + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = padding + ((maxLevel - point.waterLevel) / range) * chartHeight;
    return `${x},${y}`;
  }).filter(point => point !== null).join(' ');

  const getTrendColor = () => {
    switch (trend) {
      case 'rising': return '#ef4444'; // red-500 - poziom rośnie (zagrożenie)
      case 'falling': return '#10b981'; // green-500 - poziom spada (bezpieczne)
      default: return '#3b82f6'; // blue-500
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-3 w-3" />;
      case 'falling': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <div className="w-full">
      {/* Mini wykres */}
      <div className="relative bg-gray-50 rounded border border-gray-200" style={{ height }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          {/* Linia wykresu */}
          <polyline
            fill="none"
            stroke={getTrendColor()}
            strokeWidth="1.5"
            points={points}
            className="opacity-80"
          />
          
          {/* Punkty */}
          {data.map((point, index) => {
            if (point.waterLevel === null || isNaN(point.waterLevel)) return null;
            const x = padding + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2);
            const y = padding + ((maxLevel - point.waterLevel) / range) * chartHeight;
            
            // Sprawdź czy współrzędne są prawidłowe
            if (isNaN(x) || isNaN(y)) return null;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1"
                fill={getTrendColor()}
                className="opacity-60"
              />
            );
          }).filter(point => point !== null)}
        </svg>
        
        {/* Trend indicator */}
        <div className="absolute top-1 right-1 flex items-center space-x-1 text-xs" style={{ color: getTrendColor() }}>
          {getTrendIcon()}
          <span className="font-medium">{days}d</span>
        </div>
      </div>
      
      {/* Statystyki */}
      <div className="flex justify-between items-center mt-1 text-xs text-gray-600">
        <span>Min: {minLevel}cm</span>
        <span>{data.length} pomiarów</span>
        <span>Max: {maxLevel}cm</span>
      </div>
    </div>
  );
} 