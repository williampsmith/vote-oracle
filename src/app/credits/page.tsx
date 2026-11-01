import credits from "@/data/image-credits.json";
import { QUESTIONS } from "@/lib/questions";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Photo credits — Vote Oracle" };

type Credit = { title: string; creator: string; license: string; licenseUrl: string; sourceUrl: string };

export default function Credits() {
  const c = credits as Record<string, Credit>;
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-4xl font-medium">Photo credits</h1>
      <p className="mt-3 text-muted">
        Question backgrounds are openly licensed photos from Wikimedia Commons and Flickr. Thank you to the photographers.
      </p>
      <ol className="mt-8 grid gap-4 text-sm">
        {QUESTIONS.filter((q) => c[q.id]).map((q) => {
          const x = c[q.id];
          return (
            <li key={q.id} className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.image} alt="" width={48} height={64} className="h-16 w-12 shrink-0 rounded-md object-cover" />
              <div className="min-w-0">
                <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="block truncate font-medium underline decoration-white/30 underline-offset-2">
                  {x.title}
                </a>
                <p className="text-muted">
                  by {x.creator || "unknown"} ·{" "}
                  <a href={x.licenseUrl} target="_blank" rel="noreferrer" className="underline">
                    {x.license}
                  </a>{" "}
                  · cropped and resized
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
