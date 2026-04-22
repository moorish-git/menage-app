import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export async function notify({ targetRole, type, title, message, relatedId = null }) {
  if (!supabase) return
  await supabase.from('notifications').insert({
    target_role: targetRole,
    type,
    title,
    message,
    related_id: relatedId,
  })
}

export async function uploadApartmentImage(file) {
  if (!supabase) return null
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('apartments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('apartments').getPublicUrl(path)
  return data.publicUrl
}
