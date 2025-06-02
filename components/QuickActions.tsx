// components/QuickActions.tsx
'use client';

import { useState } from 'react';
import { RefreshCw, Download, Settings, BarChart3, Database, AlertTriangle } from 'lucide-react';

export function QuickActions() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading('sync');
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const result = await response.json();
      
      if (result.status === 'success') {
        alert('✅ Synchronizacja zakończona pomyślnie!');
      } else {
        alert('⚠️ ' + (result.message || 'Synchronizacja już trwa'));
      }
    } catch (error) {
      alert('❌ Błąd podczas synchronizacji');
      console.error('Sync error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleExport = async () => {
    setIsLoading('export');
    try {
      // Tutaj implementacja eksportu CSV
      const response = await fetch('/api/stations');
      const data = await response.json();
      
      if (data.status === 'success' && data.stations) {
        // Konwersja do CSV
        const csvContent = convertToCSV(data.stations);
        downloadCSV(csvContent, 'stacje-hydrologiczne.csv');
        alert('✅ Dane wyeksportowane pomyślnie!');
      }
    } catch (error) {
      alert('❌ Błąd podczas eksportu danych');
      console.error('Export error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = [
      'ID Stacji', 'Nazwa', 'Rzeka', 'Województwo', 'Stan Wody (cm)', 
      'Przepływ (m³/s)', 'Temperatura (°C)', 'Trend', 'Data Pomiaru'
    ];
    
    const csvRows = [
      headers.join(','),
      ...data.map(station => [
        station.id_stacji,
        `"${station.stacja}"`,
        `"${station.rzeka}"`,
        `"${station.województwo}"`,
        station.stan_wody,
        station.przelyw || '',
        station.temperatura_wody || '',
        station.trend,
        station.stan_wody_data_pomiaru
      ].join(','))
    ];
    
    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHealthCheck = async () => {
    setIsLoading('health');
    try {
      const response = await fetch('/api/health');
      const result = await response.json();
      
      let message = '🏥 STATUS SYSTEMU:\n\n';
      message += `• System: ${result.status === 'healthy' ? '✅ Działa' : '❌ Problemy'}\n`;
      message += `• Baza danych: ${result.database === 'connected' ? '✅ Połączona' : '❌ Błąd'}\n`;
      message += `• Liczba stacji: ${result.stations_count}\n`;
      message += `• Świeżość danych: ${result.data_freshness === 'fresh' ? '✅ Aktualne' : '⚠️ Nieaktualne'}\n`;
      
      if (result.latest_measurement) {
        message += `• Ostatni pomiar: ${result.latest_measurement.station} (${result.latest_measurement.age_minutes} min temu)`;
      }
      
      alert(message);
    } catch (error) {
      alert('❌ Błąd podczas sprawdzania statusu');
      console.error('Health check error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const actions = [
    {
      id: 'sync',
      title: 'Synchronizuj dane',
      description: 'Pobierz najnowsze dane z IMGW',
      icon: RefreshCw,
      action: handleSync,
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
      loadingText: 'Synchronizuję...'
    },
    {
      id: 'export',
      title: 'Eksportuj CSV',
      description: 'Pobierz wszystkie dane stacji',
      icon: Download,
      action: handleExport,
      color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
      loadingText: 'Eksportuję...'
    },
    {
      id: 'health',
      title: 'Status systemu',
      description: 'Sprawdź health check',
      icon: AlertTriangle,
      action: handleHealthCheck,
      color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200',
      loadingText: 'Sprawdzam...'
    },
    {
      id: 'stats',
      title: 'Statystyki',
      description: 'Zobacz szczegółowe dane',
      icon: BarChart3,
      action: () => window.location.href = '/stats',
      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
    },
    {
      id: 'database',
      title: 'Baza danych',
      description: 'Zarządzaj danymi',
      icon: Database,
      action: () => window.location.href = '/database',
      color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
    },
    {
      id: 'settings',
      title: 'Ustawienia',
      description: 'Konfiguracja systemu',
      icon: Settings,
      action: () => window.location.href = '/settings',
      color: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Szybkie akcje</h3>
        <span className="text-sm text-gray-500">{actions.length} opcji</span>
      </div>
      
      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={isLoading === action.id}
            className={`w-full p-4 rounded-lg border transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <action.icon 
                  className={`h-5 w-5 ${isLoading === action.id ? 'animate-spin' : ''}`} 
                />
              </div>
              <div className="text-left flex-1">
                <div className="font-medium text-sm">
                  {isLoading === action.id ? (action.loadingText || 'Ładowanie...') : action.title}
                </div>
                <div className="text-xs opacity-75 mt-0.5">
                  {action.description}
                </div>
              </div>
              {!isLoading && (
                <div className="text-xs opacity-50">
                  →
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Ostatnia aktualizacja: {new Date().toLocaleTimeString('pl-PL')}
        </div>
      </div>
    </div>
  );
}