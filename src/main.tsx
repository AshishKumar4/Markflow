import React from 'react';
import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { EditorPage } from '@/pages/EditorPage'
import { ViewPage } from '@/pages/ViewPage'
import { DocsPage } from '@/pages/DocsPage'
import { Toaster } from '@/components/ui/sonner'
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/docs",
    element: <DocsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/new",
    element: <EditorPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/edit/:id",
    element: <EditorPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/d/:id",
    element: <ViewPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors closeButton />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)