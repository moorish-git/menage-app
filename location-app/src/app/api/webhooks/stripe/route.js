import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[webhook] Signature invalide', err.message);
    return NextResponse.json({ error: `Signature invalide: ${err.message}` }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq('id', bookingId);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;
        await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', bookingId)
          .eq('status', 'pending');
        break;
      }

      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object;
        const bookingId = pi.metadata?.booking_id;
        const kind = pi.metadata?.kind;
        if (bookingId && kind === 'deposit') {
          await supabase
            .from('bookings')
            .update({
              deposit_status: 'authorized',
              stripe_deposit_intent_id: pi.id,
            })
            .eq('id', bookingId);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object;
        const bookingId = pi.metadata?.booking_id;
        const kind = pi.metadata?.kind;
        if (bookingId && kind === 'deposit') {
          await supabase
            .from('bookings')
            .update({ deposit_status: 'released' })
            .eq('id', bookingId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const bookingId = pi.metadata?.booking_id;
        const kind = pi.metadata?.kind;
        if (bookingId && kind === 'deposit') {
          await supabase
            .from('bookings')
            .update({ deposit_status: 'captured' })
            .eq('id', bookingId);
        }
        break;
      }

      default:
        // ignoré
        break;
    }
  } catch (err) {
    console.error('[webhook] Erreur traitement', err);
    return NextResponse.json({ error: 'Erreur de traitement.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
