import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib'

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded border border-stone-300 bg-white p-4"
      >
        <h1 className="mb-4 text-lg font-semibold text-stone-900">Sign in</h1>
        <div className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded border border-stone-300 px-3 py-2"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded border border-stone-300 px-3 py-2"
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-stone-900 px-3 py-2 font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}
