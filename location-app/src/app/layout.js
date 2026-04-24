import './globals.css';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export const metadata = {
  title: 'Location - Réservez vos séjours',
  description: 'Réservations de logements avec caution sécurisée.',
};

export default async function RootLayout({ children }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isHost = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isHost = profile?.role === 'host';
  }

  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-brand-600">
              Location
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-brand-600">
                Logements
              </Link>
              {user ? (
                <>
                  <Link href="/account/bookings" className="hover:text-brand-600">
                    Mes réservations
                  </Link>
                  {isHost && (
                    <Link href="/admin/properties" className="hover:text-brand-600">
                      Dashboard
                    </Link>
                  )}
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-brand-600">
                    Connexion
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700"
                  >
                    S'inscrire
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-slate-500">
            © {new Date().getFullYear()} Location. Paiements sécurisés par Stripe.
          </div>
        </footer>
      </body>
    </html>
  );
}
