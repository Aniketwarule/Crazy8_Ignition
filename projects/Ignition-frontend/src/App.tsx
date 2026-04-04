import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { PeraWalletProvider } from './hooks/usePeraWallet'
import { ThemeProvider } from './contexts/ThemeProvider'
import Home from './Home'
import Publish from './pages/Publish'
import LandingPage from './pages/LandingPage'
import ApiKey from './pages/ApiKey'
import Marketplace from './pages/Marketplace'

export default function App() {
  return (
    <BrowserRouter>
      <SnackbarProvider maxSnack={3}>
        <ThemeProvider>
          <PeraWalletProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<Home />} />
              <Route path="/publish" element={<Publish />} />
              <Route path="/api-key" element={<ApiKey />} />
              <Route path="/marketplace" element={<Marketplace />} />
            </Routes>
          </PeraWalletProvider>
        </ThemeProvider>
      </SnackbarProvider>
    </BrowserRouter>
  )
}
