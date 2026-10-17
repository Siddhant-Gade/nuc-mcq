import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <CookieConsentBanner />
    </AppProviders>
  );
};

export default App;
