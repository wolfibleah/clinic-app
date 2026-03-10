import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://etcsbftrvclakvfwimmo.supabase.co'
const supabaseKey = ''

export const supabase = createClient(supabaseUrl, supabaseKey)
