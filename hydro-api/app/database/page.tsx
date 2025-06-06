'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { 
  Database, 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Server,
  Wifi,
  Calendar,
  BarChart3
} from 'lucide-react';

interface DatabaseStats {
  database: {
    status: string;
    responseTime: number;
    totalStations: number;
    totalMeasurements: number;
    measurementsToday: number;
    measurementsThisMonth: number;
    measurementsLast24h: number;
    lastSyncTime: string | null;
    uniqueRivers: number;
    activeAlerts: number;
    stationsWithRecentData: number;
  };
  imgwApi: {
    status: string;
    monthlyRequests: number;
    dailyRequests: number;
    successfulRequests: number;
    failedRequests: number;
  };
  system: {
    status: string;
    uptime: number;
    lastCheck: string;
  };
}

export default function DatabasePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      // Dodaj timestamp żeby uniknąć cache przeglądarki
      const response = await fetch(`/api/database-stats?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setStats(data.data);
        setLastRefresh(new Date());
      } else {
        setError(data.message || 'Błąd podczas pobierania danych');
      }
    } catch (err) {
      setError('Błąd połączenia z API');
      console.error('Error fetching database stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh co 30 sekund
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Sprawny</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Ograniczony</Badge>;
      case 'slow':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Wolny</Badge>;
      case 'unhealthy':
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Błąd</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Nieznany</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Brak danych';
    return new Date(dateString).toLocaleString('pl-PL');
  };

  if (loading && !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Ładowanie statystyk bazy danych...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Błąd: {error}</span>
            </div>
            <Button onClick={fetchStats} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="h-8 w-8 mr-3 text-blue-600" />
            Baza Danych
          </h1>
          <p className="text-gray-600 mt-1">
            Szczegółowe statystyki i monitoring systemu
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Ostatnia aktualizacja: {lastRefresh.toLocaleTimeString('pl-PL')}
          </div>
          <Button 
            onClick={fetchStats} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Status systemu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="h-5 w-5 mr-2 text-green-600" />
            Status Systemu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Status ogólny</p>
                <p className="text-lg font-semibold">{getStatusBadge(stats?.system.status || 'unknown')}</p>
              </div>
              {stats?.system.status === 'operational' ? 
                <CheckCircle className="h-8 w-8 text-green-600" /> : 
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              }
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Baza danych</p>
                <p className="text-lg font-semibold">{getStatusBadge(stats?.database.status || 'unknown')}</p>
                <p className="text-xs text-gray-500">
                  PostgreSQL • {stats?.database.responseTime ? `${stats.database.responseTime}ms` : 'Brak danych'}
                </p>
              </div>
              <Database className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Czas działania</p>
                <p className="text-lg font-semibold">{formatUptime(stats?.system.uptime || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">API IMGW</p>
                <p className="text-lg font-semibold">{getStatusBadge(stats?.imgwApi.status || 'unknown')}</p>
              </div>
              <Wifi className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statystyki bazy danych */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ostatnia synchronizacja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-lg font-bold">
                  {stats?.database.lastSyncTime ? 
                    formatDate(stats.database.lastSyncTime) : 
                    'Brak danych'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.database.lastSyncTime && 
                    `${Math.round((Date.now() - new Date(stats.database.lastSyncTime).getTime()) / (1000 * 60))} min temu`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pomiary dzisiaj</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.database.measurementsToday.toLocaleString('pl-PL') || '0'}
                </p>
                <p className="text-xs text-gray-500">nowych pomiarów</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Łączna liczba stacji</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.database.totalStations.toLocaleString('pl-PL') || '0'}
                </p>
                <p className="text-xs text-gray-500">aktywnych stacji</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Łączna liczba pomiarów</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {stats?.database.totalMeasurements.toLocaleString('pl-PL') || '0'}
                </p>
                <p className="text-xs text-gray-500">wszystkich pomiarów</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statystyki API IMGW */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wifi className="h-5 w-5 mr-2 text-purple-600" />
            Statystyki API IMGW
          </CardTitle>
          <CardDescription>
            Monitoring zapytań do zewnętrznego API IMGW
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Zapytania miesięczne</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats?.imgwApi.monthlyRequests.toLocaleString('pl-PL') || '0'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Zapytania z 24h</p>
                  <p className="text-2xl font-bold text-green-700">
                    {stats?.imgwApi.dailyRequests.toLocaleString('pl-PL') || '0'}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Udane zapytania</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats?.imgwApi.successfulRequests.toLocaleString('pl-PL') || '0'}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Nieudane zapytania</p>
                  <p className="text-2xl font-bold text-red-700">
                    {stats?.imgwApi.failedRequests.toLocaleString('pl-PL') || '0'}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dodatkowe statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pomiary w tym miesiącu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.database.measurementsThisMonth.toLocaleString('pl-PL') || '0'}
            </div>
            <p className="text-sm text-gray-500 mt-1">nowych pomiarów</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktywne alerty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.database.activeAlerts.toLocaleString('pl-PL') || '0'}
            </div>
            <p className="text-sm text-gray-500 mt-1">wymagających uwagi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unikalne rzeki</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.database.uniqueRivers.toLocaleString('pl-PL') || '0'}
            </div>
            <p className="text-sm text-gray-500 mt-1">monitorowanych rzek</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 