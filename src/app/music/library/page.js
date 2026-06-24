"use client"

import dynamic from "next/dynamic"

const LibraryContent = dynamic(() => import("./library-content"), { ssr: false })

export default function LibraryPage() {
  return <LibraryContent />
}
