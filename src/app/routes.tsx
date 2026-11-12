import { lazy, Suspense, type ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/RouteGuards'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'

/** Code-split each in-app page so the landing and auth pages stay small. */
function page(loader: () => Promise<Record<string, unknown>>, name: string) {
  const Component = lazy(async () => ({ default: (await loader())[name] as ComponentType }))
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner label="Loading page" />
        </div>
      }
    >
      <Component />
    </Suspense>
  )
}

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  { path: '/privacy', element: page(() => import('@/pages/LegalPage'), 'PrivacyPage') },
  { path: '/terms', element: page(() => import('@/pages/LegalPage'), 'TermsPage') },

  // Only for signed-out visitors.
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },

  // Email-link targets: they establish a session, so they sit outside the guards.
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Signed-in application.
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: page(() => import('@/pages/app/DashboardPage'), 'DashboardPage'),
          },
          { path: '/tasks', element: page(() => import('@/pages/app/TasksPage'), 'TasksPage') },
          {
            path: '/tasks/:taskId',
            element: page(() => import('@/pages/app/TaskDetailPage'), 'TaskDetailPage'),
          },
          {
            path: '/projects',
            element: page(() => import('@/pages/app/ProjectsPage'), 'ProjectsPage'),
          },
          {
            path: '/projects/:projectId',
            element: page(() => import('@/pages/app/ProjectDetailPage'), 'ProjectDetailPage'),
          },
          {
            path: '/planner',
            element: page(() => import('@/pages/app/PlannerPage'), 'PlannerPage'),
          },
          {
            path: '/checklist',
            element: page(() => import('@/pages/app/ChecklistPage'), 'ChecklistPage'),
          },
          {
            path: '/documents',
            element: page(() => import('@/pages/app/DocumentsPage'), 'DocumentsPage'),
          },
          {
            path: '/ai-planner',
            element: page(() => import('@/pages/app/AIPlannerPage'), 'AIPlannerPage'),
          },
          {
            path: '/ai-planner/plans/:planId',
            element: page(() => import('@/pages/app/PlanReviewPage'), 'PlanReviewPage'),
          },
          {
            path: '/analytics',
            element: page(() => import('@/pages/app/AnalyticsPage'), 'AnalyticsPage'),
          },
          {
            path: '/notifications',
            element: page(() => import('@/pages/app/NotificationsPage'), 'NotificationsPage'),
          },
          {
            path: '/settings',
            element: page(() => import('@/pages/app/SettingsPage'), 'SettingsPage'),
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]
