import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getEnabledModules } from './modules';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import InstallPWA from './components/InstallPWA';
import { initializeNotifications, setupNotificationListener } from './services/notificationService';
import { subscribeToAuthState } from './services/authService';
import { User } from './types/user';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState(getEnabledModules());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setModules(getEnabledModules());
      setLoading(false);
    });

    // Initialize notifications
    const initNotifications = async () => {
      await initializeNotifications();
      setupNotificationListener();
    };
    
    initNotifications();

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            {modules.map(module => (
              <Route
                key={module.id}
                path={module.path}
                element={<module.component />}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <InstallPWA />
        </Layout>
      )}
    </Router>
  );
}

export default App;
