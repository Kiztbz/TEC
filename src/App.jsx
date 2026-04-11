import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HMSApp from './components/hms/HMSApp';
import Home from './components/Home';
import Login from './components/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Header from './components/header/Header';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import HostelManagement from './components/HostelManagement';
import Discounts from './components/Discounts';
import Map from './components/Map';
import Assignments from './components/Assignments';
import Listings from './components/Listings';
import About from './components/About';
import Poll from './components/Poll';
import MemberPortal from './components/MemberPortal';
import Messages from './components/Messages';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import AuthCallback from './components/AuthCallback';

/* Routes where the page is full-viewport (no footer, no outer scroll) */
const FULLSCREEN_ROUTES = ['/map'];

/* Public routes accessible without login */
const PUBLIC_ROUTES = ['/', '/login', '/about', '/auth/callback'];

/* Routes that render their own nav — suppress the global Header */
const NO_HEADER_ROUTES = ['/login', '/auth/callback'];

function AppShell() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const isFullscreen = FULLSCREEN_ROUTES.includes(location.pathname);
  const suppressHeader = NO_HEADER_ROUTES.includes(location.pathname);
  const [showSplash, setShowSplash] = useState(true);

  // Show landing page for anyone hitting / while not logged in
  if (!user && !loading && !PUBLIC_ROUTES.includes(location.pathname)) {
    // Guest hitting a protected route → send them home
    return <Navigate to="/" replace />;
  }

  // Landing page — standalone, no header/footer
  if (!user && location.pathname === '/') {
    return (
      <>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
        <LandingPage />
      </>
    );
  }

  // Logged-in user hitting / → send to feed
  if (user && location.pathname === '/') {
    return <Navigate to="/feed" replace />;
  }

  // Login page — standalone, no header, no app-content padding
  if (location.pathname === '/login') {
    return <Login />;
  }

  // Auth callback (e.g. password recovery)
  if (location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {!suppressHeader && <Header />}
      <div className="app-content">
        <Routes>
          <Route path="/map" element={<Map />} />
          <Route path="/feed" element={<Home />} />
          <Route path="/discounts" element={<Discounts />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/about" element={<About />} />
          <Route path="/poll" element={<Poll />} />
          <Route path="/profile" element={<MemberPortal />} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute minRole="admin"><AdminPanel /></ProtectedRoute>} />
          <Route path="/admin/hostel" element={<ProtectedRoute minRole="admin"><HostelManagement /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
        </Routes>
        {!isFullscreen && <Footer />}
      </div>
    </>
  );
}

function App() {
  // Detect HMS portal: subdomain (hms.*) OR path (/hms or /hms/*) OR ?hms=1 for local dev
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const isHMS =
    hostname.startsWith('hms.') ||
    hostname.startsWith('hms-') ||
    pathname === '/hms' ||
    pathname.startsWith('/hms/') ||
    new URLSearchParams(window.location.search).get('hms') === '1';

  if (isHMS) return <HMSApp />;

  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;