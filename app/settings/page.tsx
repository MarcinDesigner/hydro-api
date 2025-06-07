'use client';

import { useState } from 'react';
import { Settings, Database, Bell, Palette, Globe, Save, RotateCcw, CheckCircle } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

export default function SettingsPage() {
  const { settings, loading, saveSettings, resetSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const success = await saveSettings(settings);
      if (success) {
        setMessage({ type: 'success', text: 'Ustawienia zostały zapisane!' });
      } else {
        setMessage({ type: 'error', text: 'Błąd podczas zapisywania ustawień' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas zapisywania ustawień' });
    } finally {
      setSaving(false);
      // Ukryj wiadomość po 3 sekundach
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReset = async () => {
    if (!confirm('Czy na pewno chcesz przywrócić domyślne ustawienia? Wszystkie zmiany zostaną utracone.')) {
      return;
    }
    
    setResetting(true);
    setMessage(null);
    
    try {
      const success = await resetSettings();
      if (success) {
        setMessage({ type: 'success', text: 'Ustawienia zostały przywrócone do domyślnych!' });
      } else {
        setMessage({ type: 'error', text: 'Błąd podczas resetowania ustawień' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas resetowania ustawień' });
    } finally {
      setResetting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateSetting = (key: string, value: any) => {
    saveSettings({ [key]: value });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Ładowanie ustawień...</span>
        </div>
      </div>
    );
  }

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
                onChange={(e) => updateSetting('notifications', e.target.checked)}
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
                onChange={(e) => updateSetting('showAlerts', e.target.checked)}
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
                onChange={(e) => updateSetting('autoRefresh', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interwał odświeżania (minuty)
              </label>
              <select
                value={settings.refreshInterval}
                onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
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
                onChange={(e) => updateSetting('cacheEnabled', e.target.checked)}
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
                onChange={(e) => updateSetting('theme', e.target.value)}
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
                onChange={(e) => updateSetting('showCoordinates', e.target.checked)}
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
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Wiadomości */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <CheckCircle className="h-5 w-5" />
          {message.text}
        </div>
      )}

      {/* Przyciski */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCcw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetowanie...' : 'Przywróć domyślne'}
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  );
} 