import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { PeraWalletProvider } from './hooks/usePeraWallet'
import Home from './Home'
import Publish from './pages/Publish'

export default function App() {
  return (
    <BrowserRouter>
      <SnackbarProvider maxSnack={3}>
        <PeraWalletProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/publish" element={<Publish />} />
          </Routes>
        </PeraWalletProvider>
      </SnackbarProvider>
    </BrowserRouter>
  )
}
