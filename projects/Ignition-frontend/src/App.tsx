import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { PeraWalletProvider } from './hooks/usePeraWallet'
import Home from './Home'
import Publish from './pages/Publish'
import ApiKey from './pages/ApiKey'

export default function App() {
  return (
    <BrowserRouter>
      <SnackbarProvider maxSnack={3}>
        <PeraWalletProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/publish" element={<Publish />} />
            <Route path="/api-key" element={<ApiKey />} />
          </Routes>
        </PeraWalletProvider>
      </SnackbarProvider>
    </BrowserRouter>
  )
}
