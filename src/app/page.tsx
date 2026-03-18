"use client";

import Image from "next/image";

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
      <p className="text-gray-400 text-center text-sm max-w-xs">
        Talent &amp; casting agency
      </p>
    </div>
  );
}
