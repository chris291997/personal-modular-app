import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getEnabledModules } from './modules';
import Layout from './components/Layout';
import Home from './pages/Home';
import InstallPWA from './components/InstallPWA';
import { initializeNotifications, setupNotificationListener } from './services/notificationService';

function App() {
  const [modules] = useState(getEnabledModules());

  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      await initializeNotifications();
      setupNotificationListener();
    };
    
    initNotifications();
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
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
    </Router>
  );
}

export default App;
