import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// Créé par l'hôte depuis le dashboard : prépare un PaymentIntent en capture manuelle
// que le client finalisera sur /bookings/[id]/deposit.
export async function POST(request) {
  const { booking_id } = await request.json();
  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id requis.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, properties!inner(host_id)')
    .eq('id', booking_id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });
  }
  if (booking.properties.host_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }
  if (booking.deposit_amount <= 0) {
    return NextResponse.json({ error: 'Aucune caution prévue.' }, { status: 400 });
  }
  if (booking.deposit_status !== 'none') {
    return NextResponse.json({ error: `Caution déjà au statut: ${booking.deposit_status}.` }, { status: 400 });
  }

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: booking.deposit_amount,
    currency: 'eur',
    capture_method: 'manual',
    payment_method_types: ['card'],
    description: `Caution réservation ${booking.id}`,
    metadata: {
      booking_id: booking.id,
      kind: 'deposit',
    },
  });

  await supabase
    .from('bookings')
    .update({ stripe_deposit_intent_id: pi.id })
    .eq('id', booking.id);

  return NextResponse.json({ ok: true });
}
