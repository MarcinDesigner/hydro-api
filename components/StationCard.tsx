// components/StationCard.tsx
'use client';

import { StationData } from '@/types/hydro';
import { MapPin, Droplets, Thermometer, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface StationCardProps {
  station: StationData;
}

export function StationCard({ station }: StationCardProps) {
  const getTrendIcon = () => {
    switch (station.trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTrendColor = () => {
    switch (station.trend) {
      case 'rising':
        return 'text-green-600 bg-green-50';
      case 'falling':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getTrendText = () => {
    switch (station.trend) {
      case 'rising':
        return 'Rośnie';
      case 'falling':
        return 'Spada';
      default:
        return 'Stabilny';
    }
  };

  const isAlertLevel = () => {
    const waterLevel = parseInt(station.stan_wody);
    const warningLevel = station.poziom_ostrzegawczy ? parseInt(station.poziom_ostrzegawczy) : null;
    const alarmLevel = station.poziom_alarmowy ? parseInt(station.poziom_alarmowy) : null;
    
    if (alarmLevel && waterLevel >= alarmLevel) return 'alarm';
    if (warningLevel && waterLevel >= warningLevel) return 'warning';
    return 'normal';
  };

  const alertLevel = isAlertLevel();

  // Sprawdź czy są aktywne alerty dla tej stacji
  const hasActiveAlert = alertLevel !== 'normal';

  const getAlertMessage = () => {
    if (alertLevel === 'alarm') {
      return `🚨 ALARM: Poziom ${station.stan_wody} cm przekroczył próg alarmowy (${station.poziom_alarmowy} cm)`;
    } else if (alertLevel === 'warning') {
      return `⚠️ OSTRZEŻENIE: Poziom ${station.stan_wody} cm przekroczył próg ostrzegawczy (${station.poziom_ostrzegawczy} cm)`;
    }
    return '';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Brak danych';
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeDifference = (dateString: string) => {
    if (!dateString) return '';
    const now = new Date();
    const measurementDate = new Date(dateString);
    const diffMs = now.getTime() - measurementDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m temu`;
    }
    return `${diffMinutes}m temu`;
  };

  return (
    <div className={`station-card ${alertLevel === 'alarm' ? 'border-red-300 bg-red-50' : alertLevel === 'warning' ? 'border-yellow-300 bg-yellow-50' : ''}`}>
      {/* Alert Banner */}
      {hasActiveAlert && (
        <div className={`mb-4 p-3 rounded-lg border ${
          alertLevel === 'alarm' 
            ? 'bg-red-100 border-red-300 text-red-800' 
            : 'bg-yellow-100 border-yellow-300 text-yellow-800'
        }`}>
          <div className="text-xs font-medium">
            {getAlertMessage()}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{station.stacja}</h3>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            {station.rzeka} • {station.województwo}
          </div>
        </div>
        
        {/* Alert indicator */}
        {alertLevel !== 'normal' && (
          <div className={`p-1 rounded-full ${alertLevel === 'alarm' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle className={`h-4 w-4 ${alertLevel === 'alarm' ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
        )}
      </div>

      {/* Water level */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Stan wody</span>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1">{getTrendText()}</span>
            </span>
          </div>
        </div>
        <div className="mt-1">
          <span className="text-2xl font-bold text-gray-900">{station.stan_wody}</span>
          <span className="text-sm text-gray-500 ml-1">cm</span>
          {station.zmiana_poziomu && station.zmiana_poziomu !== '0' && (
            <span className={`text-sm ml-2 ${parseInt(station.zmiana_poziomu) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({station.zmiana_poziomu > '0' ? '+' : ''}{station.zmiana_poziomu} cm)
            </span>
          )}
        </div>
      </div>

      {/* Additional measurements */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {station.przelyw && (
          <div>
            <div className="flex items-center text-xs text-gray-600 mb-1">
              <Droplets className="h-3 w-3 mr-1" />
              Przepływ
            </div>
            <div className="text-sm font-medium">
              {station.przelyw} m³/s
            </div>
          </div>
        )}
        
        {station.temperatura_wody && (
          <div>
            <div className="flex items-center text-xs text-gray-600 mb-1">
              <Thermometer className="h-3 w-3 mr-1" />
              Temperatura
            </div>
            <div className="text-sm font-medium">
              {station.temperatura_wody}°C
            </div>
          </div>
        )}
      </div>

      {/* Warning/Alarm levels */}
      {(station.poziom_ostrzegawczy || station.poziom_alarmowy) && (
        <div className="mb-4 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Poziomy:</span>
            <div className="space-x-2">
              {station.poziom_ostrzegawczy && (
                <span className="text-yellow-600">
                  Ostrz: {station.poziom_ostrzegawczy}cm
                </span>
              )}
              {station.poziom_alarmowy && (
                <span className="text-red-600">
                  Alarm: {station.poziom_alarmowy}cm
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500 border-t pt-3">
        <div>Pomiar: {formatDate(station.stan_wody_data_pomiaru)}</div>
        <div className="mt-1">{getTimeDifference(station.stan_wody_data_pomiaru)}</div>
      </div>
    </div>
  );
}