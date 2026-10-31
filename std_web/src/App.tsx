import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import { CookieConsent } from './components/common/CookieConsent';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <CookieConsent />
    </AppProviders>
  );
};

export default App;
