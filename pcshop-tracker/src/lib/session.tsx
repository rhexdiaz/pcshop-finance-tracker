import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

type Profile = { id: string; full_name: string | null; role: 'admin' | 'editor' | 'viewer' }
type Ctx = {
  session: Session | null
  loading: boolean
  profile: Profile | null
}
const SessionCtx = createContext<Ctx>({ session: null, loading: true, profile: null })
export const useSession = () => useContext(SessionCtx)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess)
      if (!sess) setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!session) return
      const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', session.user.id).maybeSingle()
      if (data) setProfile(data as Profile)
    }
    load()
  }, [session])

  return <SessionCtx.Provider value={{ session, loading, profile }}>{children}</SessionCtx.Provider>
}
