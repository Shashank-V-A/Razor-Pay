"use client"

import { GlobeCdn } from "@/components/ui/globecomponent"
import type { Hackathon } from "@/client/types/hackathon"
import { hackathonsToGlobeData } from "@/client/utils/hackathonGlobe"

type HackathonGlobeProps = {
  hackathons: Hackathon[]
  className?: string
}

/** Interactive globe with clickable location pins. */
export default function HackathonGlobe({ hackathons, className = "" }: HackathonGlobeProps) {
  const { locations } = hackathonsToGlobeData(hackathons)
  return <GlobeCdn locations={locations} className={className} />
}
