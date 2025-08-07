import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import MagicBento from "../ui/MagicBento";

export default function ShowOff() {
  return (
    <section className="bg-[#f6f6f6] py-40">
      <div className="max-w-[76rem] flex-col justify-center gap-4 mx-auto">
        <div className="flex flex-col gap-4 w-full">
          <h1 className="heading-xl text-[var(--background-primary)] leading-tight">
            A network of assistants
          </h1>

          <p className="body-lg text-[var(--background-secondary)]/90 max-w-2xl leading-relaxed">
            Connect with a network of Perin assistants.
          </p>

        </div>
        <div className="flex justify-center pt-12">
        <MagicBento clickEffect enableTilt />
      </div>
      </div>

    </section>
  );
}
