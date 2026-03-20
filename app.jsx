const SUPABASE_URL = "https://lhsmjzfqqjeunxvziybj.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoc21qemZxcWpldW54dnppeWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTE0NDIsImV4cCI6MjA4OTU2NzQ0Mn0.rT0sWv9OWuUG-huDsKYd1-ha7puT6BMH9oFcjTc8Rr0"
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
async function loadData() {
  const { data } = await supabase.from('plannings').select('data').eq('id','main').single()
  return data?.data || initDefaultData()
}
async function saveData(d) {
  await supabase.from('plannings').update({ data: d, updated_at: new Date() }).eq('id','main')
}
