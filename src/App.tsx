import { useEffect, useState } from 'react'
import LoginView from './LoginView'
import DianShell from './dian/DianShell'
import LoadingScreen from './LoadingScreen'
import { clearLogin, getAccountDisplay, isAuthLoggedIn } from './authStorage'
import './App.css'

const APP_BOOT_MIN_MS = 900

export default function App() {
  const [booting, setBooting] = useState(true)
  const [loggedIn, setLoggedIn] = useState(() => isAuthLoggedIn())
  const [accountName, setAccountName] = useState(() => (isAuthLoggedIn() ? getAccountDisplay() : ''))

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), APP_BOOT_MIN_MS)
    return () => window.clearTimeout(id)
  }, [])

  if (booting) {
    return <LoadingScreen />
  }

  if (!loggedIn) {
    return (
      <LoginView
        onLoggedIn={(account) => {
          setAccountName(account.trim())
          setLoggedIn(true)
        }}
      />
    )
  }

  return (
    <DianShell
      displayName={accountName || getAccountDisplay()}
      onLogout={() => {
        clearLogin()
        setAccountName('')
        setLoggedIn(false)
      }}
    />
  )
}
