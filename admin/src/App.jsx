import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import router from './routes';
export default function App() {
    return (<ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SidebarProvider>
            <RouterProvider router={router}/>
          </SidebarProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>);
}
