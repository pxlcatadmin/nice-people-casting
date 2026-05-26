"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <Image
        src="https://i.ibb.co/v2dbL7X/Group-9.png"
        alt="Nice People"
        width={72}
        height={72}
        className="mb-6"
        unoptimized
      />
      <p className="text-gray-400 text-center text-sm max-w-xs mb-10">
        Talent &amp; casting agency
      </p>

      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/castings"
          className="block w-full py-3 rounded-full bg-nice-black text-white text-sm font-medium text-center hover:bg-black transition-colors"
        >
          View active castings
        </Link>
        <Link
          href="/admin"
          className="block w-full py-3 rounded-full border border-nice-border text-sm font-medium text-center text-gray-700 hover:border-gray-400 transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
