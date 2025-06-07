'use client';

import { useState } from 'react';
import { Settings, Database, Bell, Palette, Globe, Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    refreshInterval: 60,
    theme: 'light',
    language: 'pl',
    showCoordinates: true,
    showAlerts: true,
    cacheEnabled: true
  });

  const handleSave = () => {
    // Tutaj można dodać logikę zapisywania ustawień
    alert('Ustawienia zostały zapisane!');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Ustawienia
        </h1>
        <p className="text-gray-600 mt-1">
          Skonfiguruj aplikację według swoich preferencji
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Powiadomienia */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5" />
            Powiadomienia
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Włącz powiadomienia
              </label>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Pokaż alerty
              </label>
              <input
                type="checkbox"
                checked={settings.showAlerts}
                onChange={(e) => setSettings({...settings, showAlerts: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Odświeżanie */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Database className="h-5 w-5" />
            Dane
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Automatyczne odświeżanie
              </label>
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) => setSettings({...settings, autoRefresh: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interwał odświeżania (minuty)
              </label>
              <select
                value={settings.refreshInterval}
                onChange={(e) => setSettings({...settings, refreshInterval: parseInt(e.target.value)})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={30}>30 minut</option>
                <option value={60}>1 godzina</option>
                <option value={120}>2 godziny</option>
                <option value={300}>5 godzin</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Włącz cache
              </label>
              <input
                type="checkbox"
                checked={settings.cacheEnabled}
                onChange={(e) => setSettings({...settings, cacheEnabled: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Wygląd */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5" />
            Wygląd
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motyw
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({...settings, theme: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="light">Jasny</option>
                <option value="dark">Ciemny</option>
                <option value="auto">Automatyczny</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Pokaż współrzędne
              </label>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => setSettings({...settings, showCoordinates: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Język */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5" />
            Język i region
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Język interfejsu
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Przycisk zapisz */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Zapisz ustawienia
        </button>
      </div>
    </div>
  );
} 