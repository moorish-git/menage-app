import SignupForm from './SignupForm';

export const metadata = { title: 'Créer un compte' };

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Créer un compte</h1>
      <SignupForm />
    </div>
  );
}
