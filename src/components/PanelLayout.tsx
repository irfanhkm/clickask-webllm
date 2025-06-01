import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { HSStaticMethods, IStaticMethods } from 'preline';
import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { StorageKey } from '../constants';

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
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

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

  useEffect(() => {
    const checkRedirect = async () => {
      // Get redirect path
      const redirectResult = await browser.storage.local.get(StorageKey.SIDE_PANEL_REDIRECT);
      const redirectPath = redirectResult[StorageKey.SIDE_PANEL_REDIRECT];
      
      // Get message
      const messageResult = await browser.storage.local.get(StorageKey.SIDE_PANEL_MESSAGE);
      const messageText = messageResult[StorageKey.SIDE_PANEL_MESSAGE];
      
      if (redirectPath) {
        // Clear the redirect data
        await browser.storage.local.remove(StorageKey.SIDE_PANEL_REDIRECT);
        
        // Set the message if provided
        if (messageText) {
          setMessage(messageText);
          // Clear the message after 5 seconds
          setTimeout(() => {
            setMessage(null);
            browser.storage.local.remove(StorageKey.SIDE_PANEL_MESSAGE);
          }, 5000);
        }
        
        // Navigate to the specified path
        navigate(redirectPath);
      }
    };
    
    checkRedirect();
  }, [navigate]);
  
  return (
    <div className="flex flex-col bg-white">
      {/* Top Navigation Bar */}
      <div className="fixed w-full z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center h-12">
            <nav className="flex space-x-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === `/${item.path}` || 
                               location.pathname.startsWith(`/${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md ${
                      isActive ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-blue-600' : ''}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className="fixed w-full z-10 bg-blue-100 text-blue-800 px-4 py-2 mt-12">
          <div className="max-w-7xl mx-auto">
            {message}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PanelLayout; 