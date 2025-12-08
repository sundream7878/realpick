import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS for initial check

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdminConfig() {
    console.log('Testing t_admin_config table access...')

    try {
        const { data, error } = await supabase
            .from('t_admin_config')
            .select('*')
            .limit(1)

        if (error) {
            console.error('Error accessing table:', error)
        } else {
            console.log('Table access successful. Data:', data)
        }
    } catch (e) {
        console.error('Exception:', e)
    }
}

testAdminConfig()
