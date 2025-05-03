import { Link, useLocation, Outlet } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { HSStaticMethods, IStaticMethods } from 'preline';
import { useEffect } from 'react';

export interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface PanelLayoutProps {
  menuItems: MenuItem[];
}

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

async function loadPreline() {
  return import('preline/preline');
}

const PanelLayout: React.FC<PanelLayoutProps> = ({ menuItems }) => {
  const location = useLocation();

  useEffect(() => {
    const initPreline = async () => {
      await loadPreline();

      if (
        window.HSStaticMethods &&
        typeof window.HSStaticMethods.autoInit === 'function'
      ) {
        window.HSStaticMethods.autoInit();
      }
    };

    initPreline();
  }, []);
  
  return (
    <div className="flex flex-col bg-white">
      {/* Top Navigation Bar */}
      <div className="fixed w-full z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <nav className="ml-6 flex space-x-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === `/${item.path}` || 
                                 location.pathname.startsWith(`/${item.path}/`);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PanelLayout; 