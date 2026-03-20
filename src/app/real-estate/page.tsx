'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RealEstatePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium">Redirecting...</h2>
        <p className="text-sm text-gray-500">Taking you to the dashboard</p>
      </div>
    </div>
  )
}