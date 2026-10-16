import React from 'react';
import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginScreen } from '../features/auth/LoginScreen';
import { AuthCallback } from '../features/auth/AuthCallback';
import { UnauthorizedScreen } from '../features/auth/UnauthorizedScreen';
import { DashboardTab } from '../features/home/DashboardTab';
import { TestsTab } from '../features/tests/TestsTab';
import { TestEngineScreen } from '../features/tests/TestEngineScreen';
import { QuestionBankScreen } from '../features/question-bank/QuestionBankScreen';
import { BookmarksScreen } from '../features/bookmarks/BookmarksScreen';
import { StudyMaterialsScreen } from '../features/notes/StudyMaterialsScreen';
import { ResultsHistoryScreen } from '../features/results/ResultsHistoryScreen';
import { ResultDetailScreen } from '../features/results/ResultDetailScreen';
import { PerformanceSummaryScreen } from '../features/results/PerformanceSummaryScreen';
import { BroadcastsScreen } from '../features/notifications/BroadcastsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (redirects already authenticated students to home)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Friendly Route Error Fallback
const RouteErrorFallback: React.FC = () => {
  const error = useRouteError();
  console.error('[RouteErrorFallback]', error);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xl">
        !
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-white">Something went wrong</h2>
      <p className="text-xs text-slate-500 max-w-md">An unexpected error occurred while loading this view.</p>
      <button
        onClick={() => {
          sessionStorage.removeItem('view_result');
          window.location.href = '/results';
        }}
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
      >
        Return to Results History
      </button>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginScreen />
      </PublicRoute>
    ),
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedScreen />,
  },
  {
    path: '/test/active',
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
          <TestEngineScreen />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    errorElement: <RouteErrorFallback />,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardTab /> },
      { path: 'tests', element: <TestsTab /> },
      { path: 'question-bank', element: <QuestionBankScreen /> },
      { path: 'bookmarks', element: <BookmarksScreen /> },
      { path: 'notes', element: <StudyMaterialsScreen /> },
      { path: 'results', element: <ResultsHistoryScreen /> },
      { path: 'results/summary', element: <PerformanceSummaryScreen /> },
      { path: 'results/:id', element: <ResultDetailScreen /> },
      { path: 'notices', element: <BroadcastsScreen /> },
      { path: 'broadcasts', element: <BroadcastsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
