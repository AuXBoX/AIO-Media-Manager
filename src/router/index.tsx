import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthenticationPage } from '@/pages/AuthenticationPage';
import { ServerSelectionPage } from '@/pages/ServerSelectionPage';
import { LibraryView } from '@/pages/LibraryView';
import { MetadataDetailView } from '@/pages/MetadataDetailView';
import { SettingsView } from '@/pages/SettingsView';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RootRedirect } from './RootRedirect';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/auth',
    element: <AuthenticationPage />,
  },
  {
    path: '/servers',
    element: <ProtectedRoute requireServer={false}><ServerSelectionPage /></ProtectedRoute>,
  },
  {
    path: '/app',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/app/library" replace />,
      },
      {
        path: 'library',
        element: <LibraryView />,
      },
      {
        path: 'library/:libraryKey',
        element: <LibraryView />,
      },
      {
        path: 'metadata/:ratingKey',
        element: <MetadataDetailView />,
      },
      {
        path: 'settings',
        element: <SettingsView />,
      },
      {
        path: 'playlists',
        element: <PlaylistsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
