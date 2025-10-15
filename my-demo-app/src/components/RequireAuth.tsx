import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { currentUser } from '../lib/auth.service';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const user = currentUser();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children as React.ReactElement;
}
