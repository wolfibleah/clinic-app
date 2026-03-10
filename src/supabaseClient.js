import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://etcsbftrvclakvfwimmo.supabase.co'
const supabaseKey = 'sb_publishable_j_BtNNffa-6Vbq9mq7QCyg_2LqMHftR'

export const supabase = createClient(supabaseUrl, supabaseKey)