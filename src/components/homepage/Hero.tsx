import React from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import Squares from "../backgrounds/Squares";
import PerinMessage from "./PerinMessage";

export default function Hero({
}) {
  return (
    <main className="relative z-10 flex flex-col justify-center min-h-[90vh] max-w-[76rem] mx-auto gap-4">
      <div className="absolute inset-0 -z-10">
        <Squares speed={0.005} squareSize={20} direction="diagonal" />
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="heading-xl text-[var(--cta-text)] leading-tight">
          Meet Your <span className="gradient-text-primary">Perin</span>
        </h1>

        <p className="body-lg text-[var(--foreground-muted)] max-w-2xl leading-relaxed">
          Your AI-powered productivity assistant. Delegate smarter, work
          seamlessly, and unlock your full potential with intelligent
          automation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-8">
          <Link href="/chat">
            <Button className="text-sm w-60 h-10 bg-gray-50/90 uppercase rounded-xl border-1 border-orange-300/80 cursor-pointer">
              Go to Chat <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex w-full justify-center">
        <PerinMessage />
      </div>
    </main>
  );
}
