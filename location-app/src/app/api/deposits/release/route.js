import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

// Appelé par l'hôte après le séjour pour libérer la caution (rien n'est débité).
export async function POST(request) {
  const { booking_id } = await request.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id requis.' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, properties!inner(host_id)')
    .eq('id', booking_id)
    .single();

  if (!booking) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 });
  if (booking.properties.host_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }
  if (!['authorized', 'none'].includes(booking.deposit_status)) {
    return NextResponse.json(
      { error: `Impossible de libérer (statut: ${booking.deposit_status}).` },
      { status: 400 }
    );
  }

  if (booking.stripe_deposit_intent_id) {
    const stripe = getStripe();
    await stripe.paymentIntents.cancel(booking.stripe_deposit_intent_id);
    // Webhook payment_intent.canceled → deposit_status = 'released'.
  } else {
    const admin = createSupabaseAdminClient();
    await admin
      .from('bookings')
      .update({ deposit_status: 'released' })
      .eq('id', booking.id);
  }

  return NextResponse.json({ ok: true });
}
