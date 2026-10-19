import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Props } from './types'
import './menu.css'

export default function GameMenu({ onSettings }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="art-button" aria-label="Menu" />}>
        <img src="/art/menu.png" alt="" draggable={false} />
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="game-menu-backdrop" />
        <DialogPrimitive.Popup className="game-menu" aria-describedby={undefined}>
          <img className="game-menu-panel" src="/art/options/panel.png" alt="" draggable={false} />
          <DialogTitle className="game-menu-heading">Menu</DialogTitle>
          <DialogClose className="game-menu-close" aria-label="Close menu">
            <img src="/art/options/close.png" alt="" draggable={false} />
          </DialogClose>
          <nav className="game-menu-items" aria-label="Options">
            <button
              type="button"
              className="game-menu-item"
              onClick={() => {
                setOpen(false)
                onSettings()
              }}
            >
              <MenuItemContent icon="settings" label="Settings" />
            </button>
            <Link to="/pills" className="game-menu-item" onClick={() => setOpen(false)}>
              <MenuItemContent icon="staff" label="Staff" />
            </Link>
            <Link
              to="/rewards"
              className="game-menu-item game-menu-parents"
              onClick={() => setOpen(false)}
            >
              <MenuItemContent icon="parents" label="Parents" />
            </Link>
          </nav>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

function MenuItemContent({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="game-menu-item-content">
      <img className="game-menu-icon" src={`/art/options/${icon}.png`} alt="" draggable={false} />
      <span className="game-menu-label">{label}</span>
      <img className="game-menu-arrow" src="/art/options/arrow.png" alt="" draggable={false} />
    </span>
  )
}
