import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { nightsBetween } from '@/lib/format';

export async function POST(request) {
  try {
    const body = await request.json();
    const { property_id, check_in, check_out, guest_count } = body;

    if (!property_id || !check_in || !check_out || !guest_count) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { data: property, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .eq('is_published', true)
      .single();

    if (propErr || !property) {
      return NextResponse.json({ error: 'Logement introuvable.' }, { status: 404 });
    }

    const nights = nightsBetween(check_in, check_out);
    if (nights < 1) {
      return NextResponse.json({ error: 'Dates invalides.' }, { status: 400 });
    }
    if (guest_count < 1 || guest_count > property.max_guests) {
      return NextResponse.json(
        { error: `Nombre de voyageurs invalide (max ${property.max_guests}).` },
        { status: 400 }
      );
    }

    // Vérification d'absence de conflit (anti double réservation).
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('property_id', property_id)
      .in('status', ['pending', 'confirmed'])
      .lt('check_in', check_out)
      .gt('check_out', check_in);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Ces dates ne sont plus disponibles.' },
        { status: 409 }
      );
    }

    const subtotal = nights * property.price_per_night;
    const total = subtotal + (property.cleaning_fee || 0);

    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        property_id,
        guest_id: user.id,
        check_in,
        check_out,
        guest_count,
        nights,
        subtotal_amount: subtotal,
        cleaning_fee: property.cleaning_fee || 0,
        total_amount: total,
        deposit_amount: property.deposit_amount || 0,
        status: 'pending',
      })
      .select()
      .single();

    if (bookErr || !booking) {
      return NextResponse.json(
        { error: bookErr?.message || 'Impossible de créer la réservation.' },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Séjour · ${property.title}`,
              description: `${nights} nuit(s) du ${check_in} au ${check_out}`,
            },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        property_id,
        guest_id: user.id,
      },
      success_url: `${siteUrl}/bookings/success?booking_id=${booking.id}`,
      cancel_url: `${siteUrl}/bookings/cancel?booking_id=${booking.id}`,
    });

    await supabase
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[api/checkout]', err);
    return NextResponse.json(
      { error: err.message || 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
