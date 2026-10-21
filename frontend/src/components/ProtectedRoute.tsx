"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'PILOT')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Kantsennaw l-AuthContext y-qra mn localStorage 3ad n-tchekiw
    if (!isLoading) {
      if (!user) {
        // Ma m-loggich -> Jerri 3lih l-login
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Ma 3endouch l-7eq y-dkhoul l-had l-page (ex: PILOT bgha y-dkhoul l-page ADMIN)
        router.push(user.role === 'ADMIN' ? '/portal' : '/pilot/home');
      }
    }
  }, [user, isLoading, router, allowedRoles]);

  // Écran de chargement zwin binma l-context y-jbed l-info mn localStorage
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#38bdf8', fontWeight: 900, letterSpacing: '2px' }}>
        VERIFICATION DES HABILITATIONS...
      </div>
    );
  }

  // Ila ma-kaynch user wla ma-3endouch l-7eq, ma-t-renderi walo (bach ma t-banch l-page qbel l-redirection)
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null;
  }

  // Kolchi nadi, dkhoul tchouf l-page!
  return <>{children}</>;
}