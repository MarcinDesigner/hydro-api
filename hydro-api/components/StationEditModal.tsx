import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { StationData } from '@/types/hydro';

interface StationEditModalProps {
  station: StationData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (stationId: string, data: { riverName: string; warningLevel: number | null; alarmLevel: number | null }) => Promise<void>;
}

export function StationEditModal({ station, isOpen, onClose, onSave }: StationEditModalProps) {
  const [riverName, setRiverName] = useState('');
  const [warningLevel, setWarningLevel] = useState<string>('');
  const [alarmLevel, setAlarmLevel] = useState<string>('');
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && station) {
      setRiverName(station.rzeka || '');
      setWarningLevel(station.poziom_ostrzegawczy?.toString() || '');
      setAlarmLevel(station.poziom_alarmowy?.toString() || '');
      setError('');
    }
  }, [isOpen, station]);

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const warningLevelNum = warningLevel ? parseInt(warningLevel) : null;
      const alarmLevelNum = alarmLevel ? parseInt(alarmLevel) : null;

      // Walidacja
      if (warningLevel && isNaN(parseInt(warningLevel))) {
        setError('Poziom ostrzegawczy musi być liczbą');
        setSaving(false);
        return;
      }

      if (alarmLevel && isNaN(parseInt(alarmLevel))) {
        setError('Poziom alarmowy musi być liczbą');
        setSaving(false);
        return;
      }

      if (warningLevelNum && alarmLevelNum && warningLevelNum >= alarmLevelNum) {
        setError('Poziom ostrzegawczy musi być niższy niż poziom alarmowy');
        setSaving(false);
        return;
      }

      await onSave(station.id_stacji, {
        riverName: riverName.trim(),
        warningLevel: warningLevelNum,
        alarmLevel: alarmLevelNum
      });

      onClose();
    } catch (err) {
      setError('Błąd podczas zapisywania danych');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Edytuj stację: {station.stacja}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* River Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nazwa rzeki
            </label>
            <input
              type="text"
              value={riverName}
              onChange={(e) => setRiverName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Wprowadź nazwę rzeki..."
            />
          </div>

          {/* Warning Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poziom ostrzegawczy (cm)
            </label>
            <input
              type="number"
              value={warningLevel}
              onChange={(e) => setWarningLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="np. 200"
              min="0"
            />
          </div>

          {/* Alarm Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poziom alarmowy (cm)
            </label>
            <input
              type="number"
              value={alarmLevel}
              onChange={(e) => setAlarmLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="np. 300"
              min="0"
            />
          </div>

          {/* Current values info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Obecne wartości:</strong>
            </p>
            <p className="text-sm text-gray-600">
              Poziom wody: {station.stan_wody} cm
            </p>
            {station.poziom_ostrzegawczy && (
              <p className="text-sm text-gray-600">
                Poziom ostrzegawczy: {station.poziom_ostrzegawczy} cm
              </p>
            )}
            {station.poziom_alarmowy && (
              <p className="text-sm text-gray-600">
                Poziom alarmowy: {station.poziom_alarmowy} cm
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Zapisywanie...' : 'Zapisz'}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 