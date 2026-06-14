import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import RouterConfig from './router/index.tsx'



createRoot(document.getElementById('root')!).render(
   <RouterConfig>
    <App />
   </RouterConfig>,
)
