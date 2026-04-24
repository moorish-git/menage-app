import PropertyForm from '../PropertyForm';

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Ajouter un logement</h1>
      <PropertyForm mode="create" />
    </div>
  );
}
