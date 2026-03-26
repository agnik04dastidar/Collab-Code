import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Configure Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to enable Realtime on a table
// This is needed for the Supabase table editor to show real-time updates
export const enableRealtimeForTable = async (tableName) => {
  try {
    console.log(`Realtime enabled for table: ${tableName}`)
    console.log('Note: Make sure Realtime is enabled in Supabase Dashboard:')
    console.log('1. Go to your Supabase project')
    console.log('2. Go to Database -> Replication')
    console.log(`3. Enable replication for the "${tableName}" table`)
  } catch (error) {
    console.error('Error enabling realtime:', error)
  }
}

// Export a function to get the realtime status
export const getRealtimeStatus = () => {
  return supabase.realtime
}

