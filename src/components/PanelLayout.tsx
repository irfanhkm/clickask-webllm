import { Link, useLocation, Outlet } from 'react-router-dom';
import { MessageSquare, FileText, Settings } from 'lucide-react';

const menuItems = [
  {
    name: 'Chats',
    path: 'chats',
    icon: MessageSquare,
  },
  {
    name: 'Prompts',
    path: 'prompts',
    icon: FileText,
  },
  {
    name: 'Settings',
    path: 'settings',
    icon: Settings,
  },
];

const PanelLayout = () => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-800">ClickAsk WebLLM</h1>
              </div>
              <nav className="ml-6 flex space-x-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === `/${item.path}`;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
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
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PanelLayout; 