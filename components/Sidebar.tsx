'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Activity, 
  Database, 
  BarChart, 
  Settings, 
  FileText,
  Map,
  AlertTriangle,
  HardDrive
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Stacje', href: '/stations', icon: Activity },
  { name: 'Mapa', href: '/map', icon: Map },
  { name: 'Statystyki', href: '/stats', icon: BarChart },
  { name: 'Alerty', href: '/alerts', icon: AlertTriangle },
  { name: 'Cache IMGW', href: '/cache', icon: HardDrive },
  { name: 'API Docs', href: '/api-docs', icon: FileText },
  { name: 'Baza danych', href: '/database', icon: Database },
  { name: 'Ustawienia', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <nav className="mt-5 flex-1 space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Footer with API info */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500">
            <div className="font-medium">API Endpoint</div>
            <div className="mt-1 text-blue-600 break-all">
              hydro.aplikacja-hydro.pl/api
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 