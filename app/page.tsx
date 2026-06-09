import DogTracker from '@/components/DogTracker'

// This page is fully client-driven (Supabase realtime); skip static prerender.
export const dynamic = 'force-dynamic'

export default function Home() {
  return <DogTracker />
}
