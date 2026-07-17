import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import RouterConfig from './router/index.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { Toaster } from './components/ui/toaster.tsx'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <RouterConfig>
      <App />
    </RouterConfig>
    <Toaster />
  </ErrorBoundary>,
)
