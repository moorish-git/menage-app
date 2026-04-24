import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold mb-2">Page introuvable</h1>
      <p className="text-slate-600 mb-6">
        La page que vous cherchez n'existe pas ou n'est plus disponible.
      </p>
      <Link href="/" className="text-brand-600 hover:underline">
        ← Retour à l'accueil
      </Link>
    </div>
  );
}
