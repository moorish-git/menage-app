import Link from 'next/link';

export default function BookingCancelPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Paiement annulé</h1>
      <p className="text-slate-600">
        Aucun montant n'a été débité. Vous pouvez reprendre votre réservation à tout moment.
      </p>
      <Link
        href="/"
        className="inline-block mt-8 bg-brand-600 text-white px-5 py-2.5 rounded-md hover:bg-brand-700"
      >
        Voir les logements
      </Link>
    </div>
  );
}
