import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { PermissionsProvider } from './contexts/PermissionsContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppRouter } from './router/AppRouter'
import EnvGuard from './components/EnvGuard'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EnvGuard>
      <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        </PermissionsProvider>
      </AuthProvider>
      </ThemeProvider>
    </EnvGuard>
  </StrictMode>,
)
