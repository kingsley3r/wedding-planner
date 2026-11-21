import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './lib/i18n'
import './styles.css'
import { applyTheme } from './lib/theme'

applyTheme()
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
)
