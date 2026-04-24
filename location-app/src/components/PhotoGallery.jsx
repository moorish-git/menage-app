'use client';

import { useState } from 'react';
import { publicPhotoUrl } from '@/lib/photos';

export default function PhotoGallery({ photos, title }) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="aspect-[16/9] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
        Aucune photo
      </div>
    );
  }

  const current = publicPhotoUrl(photos[index].storage_path);

  return (
    <div>
      <div className="aspect-[16/9] bg-slate-100 rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={title} className="w-full h-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((photo, i) => (
            <button
              key={photo.storage_path}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-20 h-20 rounded-md overflow-hidden border-2 shrink-0 ${
                i === index ? 'border-brand-600' : 'border-transparent'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicPhotoUrl(photo.storage_path)}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
