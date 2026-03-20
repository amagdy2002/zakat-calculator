'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const CurrencyErrorDebugger = dynamic(
  () => import('@/components/ui/debug/CurrencyErrorDebugger').then(mod => ({ default: mod.CurrencyErrorDebugger })),
  { ssr: false }
)

const NisabDebugger = dynamic(
  () => import('@/components/ui/debug/NisabDebugger').then(mod => ({ default: mod.NisabDebugger })),
  { ssr: false }
)

export default function DevPage() {
  const router = useRouter()

  // Redirect to home in production
  if (process.env.NODE_ENV !== 'development') {
    router.replace('/')
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Redirecting...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-xl font-bold">Development Tools</h1>
      <p className="text-gray-600">
        These tools are for debugging and development purposes only.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Nisab Calculation Debugger</h2>
          <NisabDebugger />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Currency Conversion Debugger</h2>
          <CurrencyErrorDebugger />
        </section>
      </div>
    </div>
  )
}
