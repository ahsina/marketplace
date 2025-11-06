import { BadgeCheck } from 'lucide-react'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function VerifiedBadge({ size = 'md', className = '' }: VerifiedBadgeProps) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      title="Verified Seller"
    >
      <BadgeCheck
        className={`${sizes[size]} text-blue-500 fill-current`}
        strokeWidth={2}
      />
    </div>
  )
}
