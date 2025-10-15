import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { currentUser, userHasPermission } from '../lib/auth.service';

export default function RequireRole({ perm, children }: { perm: string; children: React.ReactElement }) {
  const user = currentUser();
  const location = useLocation();
  if (!user) {
    // not authenticated — send to login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!userHasPermission(user, perm)) {
    return <Navigate to="/forbidden" replace />;
  }
  return children;
}
