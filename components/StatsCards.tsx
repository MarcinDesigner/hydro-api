'use client';

import { useState, useEffect } from 'react';
import { Activity, Database, TrendingUp, AlertTriangle } from 'lucide-react';

interface Stats {
  total_stations: number;
  active_stations_24h: number;
  measurements_today: number;
  rivers_count: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Wszystkie stacje',
      value: stats?.total_stations || 0,
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      description: 'Łączna liczba stacji w systemie'
    },
    {
      title: 'Aktywne (24h)',
      value: stats?.active_stations_24h || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      description: 'Stacje z danymi z ostatnich 24h'
    },
    {
      title: 'Pomiary dzisiaj',
      value: stats?.measurements_today || 0,
      icon: Database,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      description: 'Nowe pomiary od początku dnia'
    },
    {
      title: 'Rzeki',
      value: stats?.rivers_count || 0,
      icon: AlertTriangle,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      description: 'Monitorowane rzeki w Polsce'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-600">{card.title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {card.value.toLocaleString('pl-PL')}
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 