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
    .select("id, title, slug, description, shoot_date, type")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.filter((j) => !j.type || j.type === "casting");
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

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-nice-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://i.ibb.co/v2dbL7X/Group-9.png"
              alt="Nice People"
              width={32}
              height={32}
              unoptimized
            />
            <span className="text-sm font-medium text-gray-400">Casting</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold mb-2">Active castings</h1>
          <p className="text-sm text-gray-400">
            {castings.length === 0
              ? "Nothing open right now — check back soon."
              : `${castings.length} role${castings.length === 1 ? "" : "s"} currently open. Tap a role to apply.`}
          </p>
        </div>

        {castings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm">No active castings at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {castings.map((c) => (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className="block p-6 rounded-xl border border-nice-border hover:border-gray-400 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium mb-1">{c.title}</h2>
                    {c.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                        {c.description}
                      </p>
                    )}
                    {c.shoot_date && (
                      <p className="text-xs text-gray-400">
                        Shoot: {formatShootDate(c.shoot_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-gray-300 group-hover:text-gray-600 transition-colors">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
