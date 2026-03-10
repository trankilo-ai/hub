import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoginCard } from '../components/LoginCard'
import { useAuthStore } from '../store/auth'
import { auth } from '../services/firebase'

export function LoginPage() {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const sourceCli = searchParams.get('source') === 'cli'
  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const [cliDone, setCliDone] = useState(false)

  useEffect(() => {
    if (!loading && user && !sourceCli) navigate(redirect, { replace: true })
  }, [user, loading, navigate, redirect, sourceCli])

  async function handleCliSuccess() {
    const idToken = await auth.currentUser!.getIdToken()
    const uid = auth.currentUser!.uid
    setCliDone(true)
    const callbackUrl = `${redirectUri}?token=${encodeURIComponent(idToken)}&user_id=${encodeURIComponent(uid)}`
    window.location.href = callbackUrl
  }

  if (sourceCli && !redirectUri) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <p className="text-sm text-red-600">Missing redirect_uri parameter.</p>
        </div>
      </div>
    )
  }

  if (sourceCli && cliDone) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="card w-full max-w-sm p-8 text-center flex flex-col gap-3">
          <p className="text-lg font-semibold text-zinc-900">Authentication successful</p>
          <p className="text-sm text-zinc-500">You may close this window and return to the CLI.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      {sourceCli ? (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-zinc-600">Sign in to authorize the Trankilo CLI</p>
          <LoginCard onSuccess={handleCliSuccess} />
        </div>
      ) : (
        <LoginCard onSuccess={() => navigate(redirect, { replace: true })} />
      )}
    </div>
  )
}
