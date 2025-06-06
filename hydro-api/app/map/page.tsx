'use client';

import dynamic from 'next/dynamic';

const StationsMap = dynamic(() => import('@/components/StationsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Ładowanie mapy...</p>
      </div>
    </div>
  )
});

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mapa Stacji Hydrologicznych
          </h1>
          <p className="text-gray-600">
            Interaktywna mapa stacji pomiarowych z danymi w czasie rzeczywistym
          </p>
        </div>
        
        <StationsMap />
      </div>
    </div>
  );
} 