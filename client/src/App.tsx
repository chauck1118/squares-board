import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
import AuthPage from './components/AuthPage';
import Header from './components/Header';
import BoardList from './components/BoardList';
import BoardDetail from './components/BoardDetail';
import AdminDashboard from './components/AdminDashboard';
import BoardCreationForm from './components/BoardCreationForm';
import AdminBoardManagement from './components/AdminBoardManagement';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatusNotification from './components/NetworkStatusNotification';

// Dashboard component with board list
const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">March Madness Squares</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Join a squares board and compete for tournament prizes!
          </p>
        </div>
        <BoardList />
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <NetworkStatusNotification />
            <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                <AuthGuard requireAuth={false}>
                  <AuthPage />
                </AuthGuard>
              } 
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard requireAuth={true}>
                  <Dashboard />
                </AuthGuard>
              } 
            />
            
            <Route 
              path="/boards/:id" 
              element={
                <AuthGuard requireAuth={true}>
                  <BoardDetail />
                </AuthGuard>
              } 
            />
            
            {/* Admin routes */}
            <Route 
              path="/admin" 
              element={
                <AuthGuard requireAuth={true}>
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            
            <Route 
              path="/admin/boards/create" 
              element={
                <AuthGuard requireAuth={true}>
                  <AdminGuard>
                    <BoardCreationForm />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            
            <Route 
              path="/admin/boards/:id" 
              element={
                <AuthGuard requireAuth={true}>
                  <AdminGuard>
                    <AdminBoardManagement />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;