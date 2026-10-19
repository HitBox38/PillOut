import { Menu } from '@base-ui/react/menu'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Gift, Pill, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Props } from './types'
import './menu.css'

export default function GameMenu({ onSettings }: Props) {
  const [animate, setAnimate] = useState(false)

  return (
    <Menu.Root
      onOpenChange={(_, details) => {
        // Selection hands off immediately to the destination or settings dialog.
        setAnimate(
          details.reason !== 'item-press' &&
            document.documentElement.dataset.navigationInput === 'pointer',
        )
      }}
    >
      <Menu.Trigger render={<Button className="art-button" aria-label="Menu" />}>
        <img src="/art/menu.png" alt="" draggable={false} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="game-menu-positioner" sideOffset={8} align="end">
          <Menu.Popup
            className="game-menu"
            aria-label="Game menu"
            data-motion={animate || undefined}
          >
            <Menu.Item className="game-menu-item" onClick={onSettings}>
              <span className="game-menu-item-content">
                <Settings aria-hidden="true" />
                Settings
              </span>
            </Menu.Item>
            <Menu.Item className="game-menu-item" render={<Link to="/pills" />}>
              <span className="game-menu-item-content">
                <Pill aria-hidden="true" />
                Staff
              </span>
            </Menu.Item>
            <Menu.Item className="game-menu-item" render={<Link to="/rewards" />}>
              <span className="game-menu-item-content">
                <Gift aria-hidden="true" />
                Parents
              </span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
