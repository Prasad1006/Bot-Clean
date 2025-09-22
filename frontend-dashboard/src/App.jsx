import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import CreateBotPage from './pages/CreateBotPage';
import SandboxPage from './pages/SandboxPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EditBotPage from './pages/EditBotPage';
import GeneralSettingsPage from './pages/GeneralSettingsPage';
import AppearanceSettingsPage from './pages/AppearanceSettingsPage';
import KnowledgeSettingsPage from './pages/KnowledgeSettingsPage';

function App() {
  return (
    // Ensure full-height layout and consistent background
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/create-bot" element={<CreateBotPage />} />
        <Route path="/sandbox/:botId" element={<SandboxPage />} />
        <Route path="/analytics/:botId" element={<AnalyticsPage />} />
        
        <Route path="/edit-bot/:botId" element={<EditBotPage />}>
            <Route path="general" element={<GeneralSettingsPage />} />
            <Route path="appearance" element={<AppearanceSettingsPage />} />
            <Route path="knowledge" element={<KnowledgeSettingsPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;