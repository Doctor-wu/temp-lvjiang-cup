import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminStream from './pages/admin/Stream';
import AdminTeams from './pages/admin/Teams';
import AdminSchedule from './pages/admin/Schedule';
import AdminStreamers from './pages/admin/Streamers';
import Videos from './pages/admin/Videos';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MatchDataPage from './components/features/match-data/MatchDataPage';
import MatchDataList from './pages/admin/MatchDataList';
import MatchDataManagement from './pages/admin/MatchDataManagement';
import { adminPath } from './constants/routes';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path={adminPath('login')} element={<AdminLogin />} />
        <Route path="/match/:id/games" element={<MatchDataPage />} />

        {/* Protected Routes */}
        <Route
          path={adminPath('dashboard')}
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('stream')}
          element={
            <ProtectedRoute>
              <AdminStream />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('teams')}
          element={
            <ProtectedRoute>
              <AdminTeams />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('schedule')}
          element={
            <ProtectedRoute>
              <AdminSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('streamers')}
          element={
            <ProtectedRoute>
              <AdminStreamers />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('videos')}
          element={
            <ProtectedRoute>
              <Videos />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('matches')}
          element={
            <ProtectedRoute>
              <MatchDataList />
            </ProtectedRoute>
          }
        />
        <Route
          path={adminPath('matches/:matchId/games')}
          element={
            <ProtectedRoute>
              <MatchDataManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
