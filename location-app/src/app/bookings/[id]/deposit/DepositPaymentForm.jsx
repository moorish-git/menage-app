'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

let stripePromise;
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}

export default function DepositPaymentForm({ clientSecret }) {
  return (
    <Elements stripe={getStripePromise()} options={{ clientSecret }}>
      <InnerForm />
    </Elements>
  );
}

function InnerForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setLoading(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-700">
        Caution autorisée avec succès. Actualisation en cours…
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-slate-200 p-5 space-y-4"
    >
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-md disabled:opacity-50"
      >
        {loading ? 'Validation…' : 'Autoriser la caution'}
      </button>
    </form>
  );
}
