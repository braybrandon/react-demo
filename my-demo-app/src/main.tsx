import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Shopping from './pages/Shopping';
import Manage from './features/manage/pages/Manage';
import Forbidden from './pages/Forbidden';
import RequireRole from './components/RequireRole';
import { PERM_MANAGE } from './lib/auth.service';
import Login from './pages/Login';
// OAuth callback removed for mock front-end auth
import RequireAuth from './components/RequireAuth';
import { startAuthTimer } from './lib/auth.service';
import { useEffect } from 'react';

// cast to any so we can enable global styles at runtime even if types differ
const MantProvider: any = MantineProvider;

function AppWrapper() {
  const [colorScheme] = useState<'light' | 'dark'>('light')

  return (
    <MantProvider withGlobalStyles withNormalizeCSS theme={{
      colorScheme,
      primaryColor: 'blue',
      colors: {
        blue: [
          '#eff6ff',
          '#dbeafe',
          '#bfdbfe',
          '#93c5fd',
          '#60a5fa',
          '#3b82f6',
          '#226CE0',
          '#1e40af',
          '#1e3a8a',
          '#172554',
        ],
      },
    } as any}>
      <BrowserRouter>
        <StartupAuthTimer />
        <Routes>
          {/* login is outside the app layout */}
          <Route path="/login" element={<Login />} />

          {/* entire app requires authentication */}
          <Route path="/" element={<RequireAuth><App /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="shopping" element={<Shopping />} />
            <Route path="manage" element={<RequireRole perm={PERM_MANAGE}><Manage /></RequireRole>} />
            <Route path="forbidden" element={<Forbidden />} />
          </Route>

          {/* catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantProvider>
  )
}

function StartupAuthTimer() {
  // this component runs inside BrowserRouter so we can navigate
  const navigate = useNavigate();
  useEffect(() => {
    // expose helper for post-login startup
  try { (window as any).__startAuthTimer = startAuthTimer } catch {}
    startAuthTimer(() => {
      navigate('/login', { replace: true });
    });
    return () => {
      // timer cleanup handled by auth.cancelAuthTimer if needed
    };
  }, [navigate]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
)
