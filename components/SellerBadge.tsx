import { Badge } from '@/utils/sellerBadges'

interface SellerBadgeProps {
  badge: Badge
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
}

export default function SellerBadge({
  badge,
  size = 'md',
  showDescription = false
}: SellerBadgeProps) {
  const sizes = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'text-sm',
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'text-base',
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'text-lg',
    },
  }

  return (
    <div className="inline-block">
      <div
        className={`inline-flex items-center space-x-2 rounded-full font-medium ${badge.color} ${sizes[size].container}`}
        title={badge.description}
      >
        <span className={sizes[size].icon}>{badge.icon}</span>
        <span>{badge.name}</span>
      </div>
      {showDescription && (
        <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
      )}
    </div>
  )
}
