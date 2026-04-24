import LoginForm from './LoginForm';

export const metadata = { title: 'Connexion' };

export default function LoginPage({ searchParams }) {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Connexion</h1>
      <LoginForm nextPath={searchParams?.next || '/'} />
    </div>
  );
}
