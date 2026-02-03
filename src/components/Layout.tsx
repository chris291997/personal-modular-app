import { Link, useLocation } from 'react-router-dom';
import { getEnabledModules } from '../modules';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const modules = getEnabledModules();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/">📱 Personal Management</Link>
        </div>
        <div className="navbar-links">
          {modules.map(module => (
            <Link
              key={module.id}
              to={module.path}
              className={location.pathname === module.path ? 'active' : ''}
            >
              <span className="module-icon">{module.icon}</span>
              {module.name}
            </Link>
          ))}
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
