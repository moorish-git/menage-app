import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { formatEuros, formatDate } from '@/lib/format';
import DepositPaymentForm from './DepositPaymentForm';

export const revalidate = 0;

export default async function DepositPage({ params }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, properties(title, city)')
    .eq('id', params.id)
    .eq('guest_id', user.id)
    .single();

  if (!booking) notFound();

  if (booking.deposit_amount <= 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-3">Aucune caution requise</h1>
        <p className="text-slate-600">Votre réservation ne nécessite pas de caution.</p>
      </div>
    );
  }

  if (!booking.stripe_deposit_intent_id) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-3">Caution pas encore demandée</h1>
        <p className="text-slate-600">
          L'hôte pré-autorisera la caution quelques jours avant votre arrivée. Vous recevrez alors un email avec le lien pour l'autoriser.
        </p>
        <Link href="/account/bookings" className="inline-block mt-6 text-brand-600 hover:underline">
          ← Retour à mes réservations
        </Link>
      </div>
    );
  }

  if (booking.deposit_status === 'authorized') {
    return <AlreadyAuthorized booking={booking} />;
  }
  if (booking.deposit_status === 'captured') {
    return (
      <StatusMessage
        title="Caution prélevée"
        text={`Un montant a été prélevé sur votre caution de ${formatEuros(booking.deposit_amount)}. Contactez l'hôte pour plus de détails.`}
      />
    );
  }
  if (booking.deposit_status === 'released') {
    return (
      <StatusMessage
        title="Caution libérée"
        text="La caution a été libérée. Aucun montant n'a été débité."
      />
    );
  }

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(booking.stripe_deposit_intent_id);

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Autoriser la caution</h1>
      <p className="text-slate-600 mb-6">
        Pour votre séjour à <strong>{booking.properties?.title}</strong> du {formatDate(booking.check_in)} au {formatDate(booking.check_out)}.
      </p>
      <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 text-sm mb-6">
        <p className="font-medium">
          Montant à autoriser : {formatEuros(booking.deposit_amount)}
        </p>
        <p className="text-slate-600 mt-1">
          Votre carte est uniquement pré-autorisée — aucun montant n'est débité. En cas de dégâts constatés, l'hôte peut capturer tout ou partie ; sinon la caution est libérée après votre séjour.
        </p>
      </div>
      <DepositPaymentForm clientSecret={pi.client_secret} />
    </div>
  );
}

function AlreadyAuthorized({ booking }) {
  return (
    <StatusMessage
      title="Caution déjà autorisée"
      text={`Votre caution de ${formatEuros(booking.deposit_amount)} est correctement pré-autorisée. Aucun montant n'a été débité.`}
    />
  );
}

function StatusMessage({ title, text }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-3">{title}</h1>
      <p className="text-slate-600">{text}</p>
      <Link href="/account/bookings" className="inline-block mt-6 text-brand-600 hover:underline">
        ← Retour à mes réservations
      </Link>
    </div>
  );
}
