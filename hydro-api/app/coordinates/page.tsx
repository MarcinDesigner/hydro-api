import CoordinatesManager from '@/components/CoordinatesManager';

export default function CoordinatesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Zarządzanie Współrzędnymi
          </h1>
          <p className="text-gray-600">
            Zarządzaj cache współrzędnych stacji hydrologicznych
          </p>
        </div>
        
        <CoordinatesManager />
      </div>
    </div>
  );
} 