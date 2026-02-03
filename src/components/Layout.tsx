import { Link, useLocation } from 'react-router-dom';
import { getEnabledModules } from '../modules';
import ThemeToggle from './ThemeToggle';
import { Home as HomeIcon, Wallet, CheckSquare } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const modules = getEnabledModules();

  const getIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'budget':
        return <Wallet className="w-5 h-5" />;
      case 'task':
        return <CheckSquare className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative transition-colors duration-200">
      {/* Blurred Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/caveman4-01.png)',
          filter: 'blur(8px) brightness(0.4)',
          transform: 'scale(1.1)',
        }}
      />
      
      {/* Overlay for better readability */}
      <div className="fixed inset-0 z-0 bg-gray-50/60 dark:bg-gray-900/60 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10">
      {/* Top Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <HomeIcon className="w-5 h-5 text-gray-900 dark:text-white" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                WASAPP
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-1">
                {modules.map(module => (
                  <Link
                    key={module.id}
                    to={module.path}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      location.pathname === module.path
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {getIcon(module.id)}
                      <span>{module.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-around h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center px-4 py-2 ${
              location.pathname === '/' 
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <HomeIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Link>
          {modules.map(module => (
            <Link
              key={module.id}
              to={module.path}
              className={`flex flex-col items-center justify-center px-4 py-2 ${
                location.pathname === module.path
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {getIcon(module.id)}
              <span className="text-xs font-medium mt-1">{module.name}</span>
            </Link>
          ))}
        </div>
      </nav>
      </div>
    </div>
  );
}
