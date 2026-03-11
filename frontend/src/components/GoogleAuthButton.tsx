// src/components/GoogleAuthButton.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

declare global {
  interface Window {
    google: any
  }
}

interface GoogleAuthButtonProps {
  /** 'login'    → button is on the Login page: only signs in existing users */
  /** 'register' → button is on the Register page: only creates new users   */
  intent: 'login' | 'register'
  /** Optional override for the button label text */
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
}

export function GoogleAuthButton({ intent, text }: GoogleAuthButtonProps) {
  const { googleLogin } = useAuth()
  const navigate = useNavigate()
  const btnRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

  const handleCredentialResponse = async (response: { credential: string }) => {
    setError(null)
    try {
      await googleLogin(response.credential, intent)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
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
        use_fedcm_for_prompt: true,
      })

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: text ?? (intent === 'register' ? 'signup_with' : 'signin_with'),
      })
    }

    if (window.google) initGoogle()
    else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      script?.addEventListener('load', initGoogle)
      return () => script?.removeEventListener('load', initGoogle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, intent])

  return (
    <div className="w-full">
      <div ref={btnRef} className="w-full flex justify-center" />
      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
          {error}
        </p>
      )}
    </div>
  )
}