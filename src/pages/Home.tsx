import { Link } from 'react-router-dom';
import { getEnabledModules } from '../modules';
import './Home.css';

export default function Home() {
  const modules = getEnabledModules();

  return (
    <div className="home">
      <div className="home-header">
        <h1>Welcome to Personal Management App</h1>
        <p>Manage your budget, tasks, and more in one place</p>
      </div>
      <div className="modules-grid">
        {modules.map(module => (
          <Link key={module.id} to={module.path} className="module-card">
            <div className="module-icon-large">{module.icon}</div>
            <h2>{module.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
