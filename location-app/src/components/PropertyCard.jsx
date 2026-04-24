import Link from 'next/link';
import { formatEuros } from '@/lib/format';
import { publicPhotoUrl } from '@/lib/photos';

export default function PropertyCard({ property }) {
  const firstPhoto = property.property_photos?.[0]?.storage_path;
  const imgSrc = publicPhotoUrl(firstPhoto);

  return (
    <Link
      href={`/properties/${property.id}`}
      className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition"
    >
      <div className="aspect-[4/3] bg-slate-100">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Pas de photo
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-500">{property.city}</p>
        <h3 className="font-semibold mt-1">{property.title}</h3>
        <p className="mt-2 text-sm">
          <span className="font-semibold">{formatEuros(property.price_per_night)}</span>{' '}
          <span className="text-slate-500">/ nuit</span>
        </p>
      </div>
    </Link>
  );
}
