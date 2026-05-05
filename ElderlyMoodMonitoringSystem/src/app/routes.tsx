import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import CaregiverVerify from './pages/CaregiverVerify';
import { Dashboard } from './pages/Dashboard';
import { MoodDetection } from './pages/MoodDetection';
import { Analytics } from './pages/Analytics';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Profile } from './pages/Profile';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <SignUp /> },
      { path: '/__/caregiver-verify', element: <CaregiverVerify /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'detection', element: <MoodDetection /> },
          { path: 'analytics', element: <Analytics /> },
          { path: 'alerts', element: <Alerts /> },
          { path: 'reports', element: <Reports /> },
          { path: 'profile', element: <Profile /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);