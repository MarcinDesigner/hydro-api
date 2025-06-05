// app/alerts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, MapPin, Droplets, X } from 'lucide-react';

interface Alert {
  id: string;
  station: {
    id: string;
    name: string;
    river: string;
    voivodeship: string;
  };
  alertType: 'warning' | 'alarm';
  message: string;
  waterLevel: number;
  thresholdLevel: number;
  warningLevel?: number | 'nie określono';
  alarmLevel?: number | 'nie określono';
  coordinates?: {
    longitude: number | null;
    latitude: number | null;
    source: string;
  };
  createdAt: string;
  isActive: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'alarm' | 'warning'>('all');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Odświeżaj co 30 sekund
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      if (data.status === 'success') {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.alertType === filter;
  });

  const getAlertIcon = (type: string) => {
    return type === 'alarm' 
      ? <AlertTriangle className="h-5 w-5 text-red-500" />
      : <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  };

  const getAlertColor = (type: string) => {
    return type === 'alarm'
      ? 'border-red-200 bg-red-50'
      : 'border-yellow-200 bg-yellow-50';
  };

  const getAlertBadgeColor = (type: string) => {
    return type === 'alarm'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m temu`;
    } else {
      return `${diffMinutes}m temu`;
    }
  };

  const alarmCount = alerts.filter(a => a.alertType === 'alarm').length;
  const warningCount = alerts.filter(a => a.alertType === 'warning').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Alerty systemu</h2>
        <p className="mt-2 text-gray-600">
          Aktywne ostrzeżenia i alarmy ze stacji hydrologicznych
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Alarmy</p>
              <p className="text-2xl font-bold text-red-600">{alarmCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Ostrzeżenia</p>
              <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Łącznie aktywnych</p>
              <p className="text-2xl font-bold text-green-600">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Wszystkie ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('alarm')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'alarm' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alarmy ({alarmCount})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ostrzeżenia ({warningCount})
        </button>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-6 rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow ${getAlertColor(alert.alertType)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAlertIcon(alert.alertType)}
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertBadgeColor(alert.alertType)}`}>
                      {alert.alertType === 'alarm' ? 'ALARM' : 'OSTRZEŻENIE'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Rozwiąż alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Station Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{alert.station.name}</h3>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {alert.station.river} • {alert.station.voivodeship}
                </div>
              </div>

              {/* Alert Message */}
              <div className="mb-4">
                <p className="text-sm text-gray-800 leading-relaxed">{alert.message}</p>
              </div>

              {/* Water Level Info */}
              <div className="mb-4 p-3 bg-white rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Poziom wody</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{alert.waterLevel} cm</div>
                    <div className="text-xs text-gray-500">
                      Aktualny próg: {alert.thresholdLevel} cm
                    </div>
                  </div>
                </div>
                
                {/* Poziomy ostrzegawczy i alarmowy */}
                {(alert.warningLevel || alert.alarmLevel) && (
                  <div className="mt-2 text-xs text-gray-600">
                    {alert.warningLevel && typeof alert.warningLevel === 'number' && (
                      <div className="flex justify-between">
                        <span>Poziom ostrzegawczy:</span>
                        <span className="font-medium text-yellow-600">{alert.warningLevel} cm</span>
                      </div>
                    )}
                    {alert.alarmLevel && typeof alert.alarmLevel === 'number' && (
                      <div className="flex justify-between">
                        <span>Poziom alarmowy:</span>
                        <span className="font-medium text-red-600">{alert.alarmLevel} cm</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Progress bar */}
                <div className="mt-2">
                  {(() => {
                    // Oblicz maksymalny poziom (największy z dostępnych progów + 10%)
                    const maxLevel = Math.max(
                      alert.thresholdLevel,
                      typeof alert.warningLevel === 'number' ? alert.warningLevel : 0,
                      typeof alert.alarmLevel === 'number' ? alert.alarmLevel : 0,
                      alert.waterLevel
                    ) * 1.1;
                    
                    return (
                      <>
                        <div className="relative w-full bg-gray-200 rounded-full h-3">
                          {/* Pasek aktualnego poziomu */}
                          <div
                            className={`h-3 rounded-full ${
                              alert.alertType === 'alarm' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                            style={{
                              width: `${Math.min((alert.waterLevel / maxLevel) * 100, 100)}%`
                            }}
                          ></div>
                          
                          {/* Linia progu ostrzegawczego */}
                          {typeof alert.warningLevel === 'number' && (
                            <div
                              className="absolute top-0 w-0.5 h-3 bg-yellow-600"
                              style={{
                                left: `${Math.min((alert.warningLevel / maxLevel) * 100, 100)}%`
                              }}
                              title={`Próg ostrzegawczy: ${alert.warningLevel} cm`}
                            ></div>
                          )}
                          
                          {/* Linia progu alarmowego */}
                          {typeof alert.alarmLevel === 'number' && (
                            <div
                              className="absolute top-0 w-0.5 h-3 bg-red-600"
                              style={{
                                left: `${Math.min((alert.alarmLevel / maxLevel) * 100, 100)}%`
                              }}
                              title={`Próg alarmowy: ${alert.alarmLevel} cm`}
                            ></div>
                          )}
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0 cm</span>
                          <span>{Math.round(maxLevel)} cm (maks. skala)</span>
                        </div>
                        
                        {/* Legenda progów */}
                        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                          {typeof alert.warningLevel === 'number' && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-yellow-600"></div>
                              <span>Ostrzegawczy: {alert.warningLevel} cm</span>
                            </div>
                          )}
                          {typeof alert.alarmLevel === 'number' && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-red-600"></div>
                              <span>Alarmowy: {alert.alarmLevel} cm</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Współrzędne */}
                {alert.coordinates && 
                 typeof alert.coordinates.longitude === 'number' && 
                 typeof alert.coordinates.latitude === 'number' && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Współrzędne:</span>
                        <span className="font-mono">
                          {alert.coordinates.latitude.toFixed(4)}°N, {alert.coordinates.longitude.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Źródło:</span>
                        <span className="capitalize">{alert.coordinates.source}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>Utworzony: {formatTime(alert.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak aktywnych alertów</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'Wszystkie stacje działają prawidłowo.'
              : `Brak aktywnych ${filter === 'alarm' ? 'alarmów' : 'ostrzeżeń'}.`
            }
          </p>
        </div>
      )}
    </div>
  );
}