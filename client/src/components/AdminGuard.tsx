import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import LoadingSpinner from './LoadingSpinner';

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const session = await fetchAuthSession();
        
        if (!session.tokens) {
          setIsAdmin(false);
          return;
        }
        
        // Check if user has admin attribute or is in admin group
        const userAttributes = await fetchUserAttributes();
        
        // Check custom attribute for admin status
        const isAdminAttribute = userAttributes['custom:isAdmin'] === 'true';
        
        // Check groups from JWT token
        const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
        const isInAdminGroup = groups.includes('admins');
        
        setIsAdmin(isAdminAttribute || isInAdminGroup);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;