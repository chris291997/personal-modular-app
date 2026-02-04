import { Link, useLocation } from 'react-router-dom';
import { getEnabledModules } from '../modules';
import ThemeToggle from './ThemeToggle';
import { getCurrentUser, logout, subscribeToAuthState } from '../services/authService';
import { Home as HomeIcon, Wallet, CheckSquare, LogOut, User as UserIcon, Settings, Users, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { User } from '../types/user';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const modules = getEnabledModules();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to auth state changes instead of polling
    const unsubscribe = subscribeToAuthState((currentUser: User | null) => {
      setUser(currentUser);
    });
    
    // Set initial user
    setUser(getCurrentUser());
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getIcon = (moduleId: string, size: string = "w-5 h-5") => {
    switch (moduleId) {
      case 'budget':
        return <Wallet className={size} />;
      case 'task':
        return <CheckSquare className={size} />;
      case 'users':
        return <Users className={size} />;
      case 'settings':
        return <SettingsIcon className={size} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative transition-colors duration-200 flex">
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
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 z-40 flex-col items-center py-4 bg-black/20 dark:bg-black/40 backdrop-blur-md border-r border-white/10 dark:border-white/5">
        <Link 
          to="/" 
          className={`mb-6 p-3 rounded-xl transition-all ${
            location.pathname === '/' 
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-white/5'
          }`}
        >
          <HomeIcon className="w-6 h-6" />
        </Link>
        
        <div className="flex flex-col items-center space-y-4 flex-1">
          {modules.map(module => (
            <Link
              key={module.id}
              to={module.path}
              className={`p-3 rounded-xl transition-all ${
                location.pathname === module.path
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-white/5'
              }`}
              title={module.name}
            >
              {getIcon(module.id, "w-6 h-6")}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 md:ml-20">
        {/* Top Navigation */}
        <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="w-full max-w-full mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center space-x-2 md:hidden">
                <HomeIcon className="w-4 h-4 text-gray-900 dark:text-white" />
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  WASAPP
                </span>
              </Link>
              
              <div className="flex items-center space-x-4 ml-auto">
                <ThemeToggle />
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user?.name || 'User'}
                    </span>
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="w-full max-w-full mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 md:py-8 min-h-[calc(100vh-4rem)] pb-20 md:pb-8">
          {children}
        </main>

        {/* Bottom Navigation (Mobile) - Icons Only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-50">
          <div className="flex items-center justify-around h-16">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center flex-1 ${
                location.pathname === '/' 
                  ? 'text-purple-600 dark:text-purple-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <HomeIcon className="w-6 h-6" />
            </Link>
            {modules.map(module => (
              <Link
                key={module.id}
                to={module.path}
                className={`flex flex-col items-center justify-center flex-1 ${
                  location.pathname === module.path
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {getIcon(module.id, "w-6 h-6")}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
