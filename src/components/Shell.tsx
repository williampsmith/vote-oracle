"use client";

import { QUESTIONS } from "@/lib/questions";

const MOSAIC = [0, 4, 8, 12, 19, 26, 30, 35, 44, 2, 15, 37].map((i) => QUESTIONS[i]?.image).filter(Boolean);

/**
 * Responsive frame for the single-column steps. On phones it's just the column; on large
 * screens the content sits on the right and a drifting photo mosaic fills the left half.
 */
export function Shell({ children, tagline }: { children: React.ReactNode; tagline?: string }) {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside aria-hidden className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:-mr-px lg:block lg:h-dvh">
        <div className="mosaic-drift absolute -inset-16 grid grid-cols-3 gap-3 p-3">
          {[...MOSAIC, ...MOSAIC].map((src, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl bg-ink-2 bg-cover bg-center"
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink/20 via-ink/55 to-ink to-[97%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
        {tagline && (
          <p className="absolute bottom-12 left-12 max-w-md font-display text-4xl font-medium leading-tight text-paper text-balance drop-shadow-[0_2px_20px_rgba(0,0,0,.8)]">
            {tagline}
          </p>
        )}
      </aside>
      <div className="lg:flex lg:items-center lg:justify-center lg:px-10">
        <div className="w-full lg:max-w-lg">{children}</div>
      </div>
    </div>
  );
}
