import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRoles() {
    console.log('Checking user roles...')

    const { data: users, error } = await supabase
        .from('t_users')
        .select('f_id, f_email, f_nickname, f_role')

    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    console.log('Total users:', users.length)
    users.forEach(user => {
        console.log(`User: ${user.f_nickname} (${user.f_email}) - Role: ${user.f_role} [ID: ${user.f_id}]`)
    })
}

checkRoles()
