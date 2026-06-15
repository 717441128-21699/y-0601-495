import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import SimulationList from '@/pages/SimulationList';
import SimulationNew from '@/pages/SimulationNew';
import SimulationDetail from '@/pages/SimulationDetail';
import SimulationMesh from '@/pages/SimulationMesh';
import SimulationCalculate from '@/pages/SimulationCalculate';
import WarningCenter from '@/pages/WarningCenter';
import ApprovalCenter from '@/pages/ApprovalCenter';
import ReportList from '@/pages/ReportList';
import ReportDetail from '@/pages/ReportDetail';
import RecommendationCenter from '@/pages/RecommendationCenter';
import ConfigRisk from '@/pages/ConfigRisk';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulations" element={<SimulationList />} />
          <Route path="/simulations/new" element={<SimulationNew />} />
          <Route path="/simulations/:id/*">
            <Route index element={<SimulationDetail />} />
            <Route path="mesh" element={<SimulationMesh />} />
            <Route path="calculate" element={<SimulationCalculate />} />
          </Route>
          <Route path="/warnings" element={<WarningCenter />} />
          <Route path="/approvals" element={<ApprovalCenter />} />
          <Route path="/reports" element={<ReportList />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/recommendations" element={<RecommendationCenter />} />
          <Route path="/configurations" element={<ConfigRisk />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
