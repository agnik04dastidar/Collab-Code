import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// Configure Supabase client with Realtime options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper function to enable Realtime on a table
// This is needed for the Supabase table editor to show real-time updates
export const enableRealtimeForTable = async (tableName) => {
  try {
    // Note: This requires the service_role key to be available
    // For client-side, Realtime must be enabled in the Supabase dashboard
    console.log(`Realtime should be enabled for table: ${tableName}`)
    console.log('Please enable Realtime in Supabase Dashboard:')
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

