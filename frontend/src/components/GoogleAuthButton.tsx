import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

declare global {
  interface Window {
    google: any
  }
}

export function GoogleAuthButton({ }) {
  const { googleLogin } = useAuth()
  const navigate = useNavigate()
  const btnRef = useRef<HTMLDivElement | null>(null)
  const [, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

  const handleCredentialResponse = async (response: { credential: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      await googleLogin(response.credential)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !clientId || !btnRef.current) return

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true, // ok to keep
      })

      // ✅ Render the official Google button (reliable)
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
      })
    }

    if (window.google) initGoogle()
    else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      script?.addEventListener('load', initGoogle)
      return () => script?.removeEventListener('load', initGoogle)
    }
  }, [clientId])

  return (
    <div className="w-full">
      {/* Google rendered button */}
      <div ref={btnRef} className="w-full flex justify-center" />

      {/* Optional: your error UI */}
      {error && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
          {error}
        </p>
      )}
    </div>
  )
}