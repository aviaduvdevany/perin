import React from 'react'
import { BubbleBackground } from '../animate-ui/backgrounds/bubble'
import { GlassCard } from '../ui/Glass'

export default function Features() {
  return (
    <section id="features" className="relative z-10 py-20 px-8">
    <BubbleBackground >
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="heading-lg text-[var(--cta-text)] mb-6">
          Why Choose Perin?
        </h2>
        <p className="body-lg text-[var(--foreground-muted)] max-w-2xl mx-auto">
          Experience the future of productivity with our cutting-edge AI
          technology
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <GlassCard className="p-8 text-center group hover:scale-105 transition-transform duration-300">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform glow-primary">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="heading-sm text-[var(--cta-text)] mb-4">
            Secure Authentication
          </h3>
          <p className="body-md text-[var(--foreground-subtle)] leading-relaxed">
            Built with NextAuth.js for enterprise-grade security and
            seamless user experience
          </p>
        </GlassCard>

        <GlassCard className="p-8 text-center group hover:scale-105 transition-transform duration-300">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform glow-primary">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
          </div>
          <h3 className="heading-sm text-[var(--cta-text)] mb-4">
            Intelligent Database
          </h3>
          <p className="body-md text-[var(--foreground-subtle)] leading-relaxed">
            PostgreSQL with type-safe queries and intelligent error handling
            for reliable performance
          </p>
        </GlassCard>

        <GlassCard className="p-8 text-center group hover:scale-105 transition-transform duration-300">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform glow-primary">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="heading-sm text-[var(--cta-text)] mb-4">
            Futuristic UI
          </h3>
          <p className="body-md text-[var(--foreground-subtle)] leading-relaxed">
            Modern, responsive design with glass effects and smooth
            animations for an immersive experience
          </p>
        </GlassCard>
      </div>
    </div>
    </BubbleBackground>
  </section>
  )
}
