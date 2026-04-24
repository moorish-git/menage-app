import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// Appelé par l'hôte pour capturer tout ou partie de la caution (en cas de dégâts).
export async function POST(request) {
  const { booking_id, amount_to_capture } = await request.json();
  if (!booking_id || typeof amount_to_capture !== 'number') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
  }

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
  if (booking.deposit_status !== 'authorized') {
    return NextResponse.json({ error: 'Caution non autorisée.' }, { status: 400 });
  }
  if (amount_to_capture <= 0 || amount_to_capture > booking.deposit_amount) {
    return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 });
  }

  const stripe = getStripe();
  await stripe.paymentIntents.capture(booking.stripe_deposit_intent_id, {
    amount_to_capture,
  });
  // Le webhook payment_intent.succeeded mettra deposit_status = 'captured'.

  return NextResponse.json({ ok: true });
}
