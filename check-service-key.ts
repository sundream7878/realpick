
import { createClient } from "@supabase/supabase-js"
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Checking Supabase configuration...')
console.log('URL:', supabaseUrl ? 'Present' : 'Missing')
console.log('Service Role Key:', serviceRoleKey ? 'Present' : 'Missing')

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function main() {
    console.log('Attempting to fetch users with Service Role Key...')
    const { data, error } = await supabase.from('t_users').select('count', { count: 'exact', head: true })

    if (error) {
        console.error('Error:', error.message)
    } else {
        console.log('Success! Connection established.')
        console.log('User count:', data) // data is null for head:true with count, but count is in count property. Wait, select returns { data, error, count }
    }

    // Actually let's just select one user to be sure
    const { data: users, error: userError } = await supabase.from('t_users').select('f_id').limit(1)
    if (userError) {
        console.error('Error fetching users:', userError.message)
    } else {
        console.log('Successfully fetched users:', users.length)
    }
}

main()
