/* eslint-disable react-refresh/only-export-components */
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import MemberCardPage from './MemberCardPage'
const App = lazy(() => import('./App.tsx'))

const memberCardMatch = window.location.pathname.match(/^\/membre\/([^/]+)\/([a-f0-9]+)\/?$/i)
const memberCard = memberCardMatch ? <MemberCardPage memberNumber={decodeURIComponent(memberCardMatch[1])} token={memberCardMatch[2]} /> : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f6f8fc] text-sm text-slate-500">Chargement de Mbokamaket...</div>}>
          {memberCard || <App />}
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
