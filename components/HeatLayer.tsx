'use client'

import { ROOM_META, DOG_META } from '@/lib/types'
import { heatOpacity } from '@/lib/heatmap'
import type { RoomHeat, Dog } from '@/lib/types'

interface Props {
  dog: Dog
  heat: RoomHeat[]
  visible: boolean
}

export default function HeatLayer({ dog, heat, visible }: Props) {
  if (!visible) return null

  const meta = DOG_META[dog]
  const maxMinutes = Math.max(1, ...heat.map(h => h.minutes))

  return (
    <>
      {heat.map(({ room, minutes, isLive }) => {
        const bounds = ROOM_META[room]
        const opacity = heatOpacity(minutes, maxMinutes)

        if (opacity === 0 && !isLive) return null

        return (
          <g key={`${dog}-${room}`}>
            {/* Heat blob — radial gradient centered on room */}
            {opacity > 0 && (
              <ellipse
                cx={bounds.x + bounds.width / 2}
                cy={bounds.y + bounds.height / 2}
                rx={bounds.width * 0.42}
                ry={bounds.height * 0.42}
                fill={`rgba(${meta.heatColor}, ${opacity})`}
                style={{ mixBlendMode: 'multiply' }}
              />
            )}

            {/* Pulsing live dot when dog is currently here */}
            {isLive && (
              <>
                <circle
                  cx={bounds.x + bounds.width / 2}
                  cy={bounds.y + bounds.height / 2}
                  r={14}
                  fill={meta.color}
                  opacity={0.25}
                >
                  <animate
                    attributeName="r"
                    values="10;20;10"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0.05;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={bounds.x + bounds.width / 2}
                  cy={bounds.y + bounds.height / 2}
                  r={7}
                  fill={meta.color}
                />
                <text
                  x={bounds.x + bounds.width / 2}
                  y={bounds.y + bounds.height / 2 - 16}
                  textAnchor="middle"
                  fontSize={18}
                >
                  {meta.emoji}
                </text>
              </>
            )}
          </g>
        )
      })}
    </>
  )
}
