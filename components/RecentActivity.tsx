// components/RecentActivity.tsx
'use client';

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Database } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'measurement' | 'alert' | 'sync';
  message: string;
  timestamp: string;
  station?: string;
}

export function RecentActivity() {
  const [activities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'measurement',
      message: 'Nowy pomiar - poziom wody 245 cm',
      timestamp: '2025-05-20T10:30:00Z',
      station: 'WARSZAWA'
    },
    {
      id: '2',
      type: 'alert',
      message: 'Przekroczony poziom ostrzegawczy',
      timestamp: '2025-05-20T10:15:00Z',
      station: 'KRAKÓW'
    },
    {
      id: '3',
      type: 'sync',
      message: 'Synchronizacja danych zakończona - 245 stacji',
      timestamp: '2025-05-20T10:00:00Z'
    },
    {
      id: '4',
      type: 'measurement',
      message: 'Aktualizacja przepływu - 123.5 m³/s',
      timestamp: '2025-05-20T09:45:00Z',
      station: 'GDAŃSK'
    },
    {
      id: '5',
      type: 'measurement',
      message: 'Temperatura wody zaktualizowana - 15.2°C',
      timestamp: '2025-05-20T09:30:00Z',
      station: 'WROCŁAW'
    },
    {
      id: '6',
      type: 'alert',
      message: 'Poziom wody spadł poniżej normy',
      timestamp: '2025-05-20T09:15:00Z',
      station: 'POZNAŃ'
    }
  ]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'measurement':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'alert':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'sync':
        return <Database className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'measurement':
        return 'bg-blue-50 border-blue-100';
      case 'alert':
        return 'bg-red-50 border-red-100';
      case 'sync':
        return 'bg-green-50 border-green-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours > 0) {
      return `${diffHours}h temu`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m temu`;
    } else {
      return 'Teraz';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'measurement':
        return 'Pomiar';
      case 'alert':
        return 'Alert';
      case 'sync':
        return 'Synchronizacja';
      default:
        return 'Inne';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Ostatnia aktywność</h3>
        <span className="text-sm text-gray-500">{activities.length} wydarzeń</span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors hover:shadow-sm ${getActivityBgColor(activity.type)}`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {getTypeLabel(activity.type)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">{activity.message}</p>
              {activity.station && (
                <div className="flex items-center mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                    📍 {activity.station}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
          Zobacz wszystkie wydarzenia →
        </button>
      </div>
    </div>
  );
}