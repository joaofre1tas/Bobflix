import type { LucideIcon } from 'lucide-react'
import { Sparkles, Film, Heart, Calendar, BookmarkPlus, PartyPopper } from 'lucide-react'

export type MilestoneType =
  | 'first_watch'
  | 'ten_videos'
  | 'first_note'
  | 'week_together'
  | 'month_together'
  | 'wishlist_three'

export interface MilestoneDef {
  type: MilestoneType
  label: string
  description: string
  icon: LucideIcon
}

export const MILESTONE_DEFINITIONS: MilestoneDef[] = [
  {
    type: 'first_watch',
    label: 'Primeira sessão',
    description: 'Assistiram o primeiro vídeo juntos no Bobflix.',
    icon: Sparkles,
  },
  {
    type: 'ten_videos',
    label: 'Maratonistas',
    description: 'Já são 10 vídeos marcando história a dois.',
    icon: Film,
  },
  {
    type: 'first_note',
    label: 'Primeiro recado',
    description: 'Trocaram o primeiro recado carinhoso.',
    icon: Heart,
  },
  {
    type: 'week_together',
    label: 'Uma semana',
    description: 'Uma semana de vínculo no Bobflix — tempo voou!',
    icon: Calendar,
  },
  {
    type: 'month_together',
    label: 'Um mês juntos',
    description: 'Trinta dias de casal no app. Orgulho!',
    icon: PartyPopper,
  },
  {
    type: 'wishlist_three',
    label: 'Lista dos sonhos',
    description: 'Três ou mais filmes na lista “queremos assistir”.',
    icon: BookmarkPlus,
  },
]

export interface CoupleStats {
  videosTogether: number
  notesCount: number
  wishlistCount: number
  daysSincePartnership: number
}

export function milestoneUnlocked(type: MilestoneType, s: CoupleStats): boolean {
  switch (type) {
    case 'first_watch':
      return s.videosTogether >= 1
    case 'ten_videos':
      return s.videosTogether >= 10
    case 'first_note':
      return s.notesCount >= 1
    case 'week_together':
      return s.daysSincePartnership >= 7
    case 'month_together':
      return s.daysSincePartnership >= 30
    case 'wishlist_three':
      return s.wishlistCount >= 3
    default:
      return false
  }
}

export function valueForMilestone(type: MilestoneType, s: CoupleStats): number {
  switch (type) {
    case 'first_watch':
    case 'ten_videos':
      return s.videosTogether
    case 'first_note':
      return s.notesCount
    case 'week_together':
    case 'month_together':
      return s.daysSincePartnership
    case 'wishlist_three':
      return s.wishlistCount
    default:
      return 0
  }
}
