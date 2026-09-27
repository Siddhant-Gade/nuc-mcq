import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import ErrorBoundary from './components/ErrorBoundary';
import router from './routes';

export default function App() {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SidebarProvider>
                <RouterProvider router={router}/>
              </SidebarProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
}
