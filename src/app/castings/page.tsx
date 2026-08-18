import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

interface ActiveCasting {
  id: string;
  title: string;
  slug: string;
  description: string;
  shoot_date: string | null;
}

async function getActiveCastings(): Promise<ActiveCasting[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, slug, description, shoot_date")
    .eq("status", "open")
    .eq("type", "casting")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data;
}

function formatShootDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CastingsPage() {
  const castings = await getActiveCastings();
  const count = castings.length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-nice-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="https://i.ibb.co/v2dbL7X/Group-9.png"
              alt="Nice People"
              width={26}
              height={26}
              unoptimized
            />
          </Link>
          <a
            href="https://instagram.com/nicepeopleau"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-black transition-colors"
          >
            @nicepeopleau
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-5 py-7">
        <div className="mb-5">
          <h1 className="text-base font-semibold mb-0.5">Active castings</h1>
          <p className="text-xs text-gray-500">
            {count === 0
              ? "Nothing open right now. Check back soon."
              : `${count} role${count === 1 ? "" : "s"} open · accepting applications`}
          </p>
        </div>

        {count === 0 ? (
          <div className="border border-nice-border rounded-lg py-8 text-center">
            <p className="text-xs text-gray-400 mb-3">No active castings.</p>
            <a
              href="https://instagram.com/nicepeopleau"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-black hover:underline"
            >
              Follow @nicepeopleau →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {castings.map((c) => (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className="block border border-nice-border rounded-lg px-4 py-3.5 hover:border-gray-400 transition-colors group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Live
                      </span>
                      {c.shoot_date && (
                        <>
                          <span className="text-gray-300 text-[11px]">·</span>
                          <span className="text-[11px] text-gray-500">
                            Shoot {formatShootDate(c.shoot_date)}
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="text-sm font-semibold text-black leading-tight mb-0.5 truncate">
                      {c.title}
                    </h2>
                    {c.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 leading-snug">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-black">
                    <span className="hidden sm:inline">Apply</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:translate-x-0.5 transition-transform"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-nice-border mt-8">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between text-xs text-gray-400">
          <p>Nice People · Talent &amp; casting</p>
          <a
            href="https://instagram.com/nicepeopleau"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
          >
            @nicepeopleau
          </a>
        </div>
      </footer>
    </div>
  );
}
