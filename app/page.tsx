// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { StatsCards } from '../components/StatsCards';
import APIConfigPanel from '../components/APIConfigPanel';

export default function Dashboard() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-2 text-gray-600">
            Przegląd systemu API danych hydrologicznych
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
            showConfig 
              ? 'bg-blue-600 text-white' 
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ⚙️ {showConfig ? 'Ukryj' : 'Pokaż'} konfigurację
        </button>
      </div>

      {/* API Configuration Panel */}
      {showConfig && <APIConfigPanel />}

      {/* Stats cards */}
      <StatsCards />

      {/* API Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/health</code>
              <span className="text-sm text-green-600">✓ Aktywny</span>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/stations</code>
              <span className="text-sm text-green-600">✓ Aktywny</span>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/station/[id]</code>
              <span className="text-sm text-green-600">✓ Aktywny</span>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/stats</code>
              <span className="text-sm text-green-600">✓ Aktywny</span>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/sync</code>
              <span className="text-sm text-green-600">✓ Aktywny</span>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/config</code>
              <span className="text-sm text-blue-600">🆕 Nowy</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Źródło danych</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">IMGW API</p>
              <p className="text-xs text-gray-500">Konfigurowalny endpoint (hydro/hydro2)</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Status połączenia</p>
              <p className="text-xs text-green-600">✓ Połączono</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Ostatnia synchronizacja</p>
              <p className="text-xs text-gray-500">W czasie rzeczywistym</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Baza danych</p>
              <p className="text-xs text-green-600">✓ Supabase połączona</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}