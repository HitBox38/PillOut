import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Clock3 } from 'lucide-react'
import { Artwork } from '@/components/artwork'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSetupViewport } from '../hooks/useSetupViewport'
import type { CatalogPill } from '../types'

const twoDigits = (value: number) => String(value).padStart(2, '0')

function TimeSelection({
  pill,
  value,
  onConfirm,
}: {
  pill: CatalogPill
  value: string
  onConfirm: (time: string) => void
}) {
  const [hour, setHour] = useState(Number(value.split(':')[0] || 8))
  const [minute, setMinute] = useState(Number(value.split(':')[1] || 0))
  const height = useSetupViewport()
  const time = `${twoDigits(hour)}:${twoDigits(minute)}`

  return (
    <DialogContent
      className="plan-time-dialog"
      showCloseButton={false}
      data-compact={height < 450 || undefined}
      style={{ maxHeight: height - 24, top: height / 2 }}
    >
      <div className="time-picker-heading">
        <Artwork source="pills" crop={pill.crop} />
        <div>
          <DialogTitle>Choose a time</DialogTitle>
          <DialogDescription>{pill.name} · 24-hour clock</DialogDescription>
        </div>
      </div>
      <div className="time-picker-dials">
        {[
          { label: 'Hour', value: hour, set: setHour, limit: 24 },
          { label: 'Minute', value: minute, set: setMinute, limit: 60 },
        ].map((part) => (
          <div className="time-picker-dial" key={part.label}>
            <span>{part.label}</span>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Increase ${part.label.toLowerCase()}`}
              onClick={() => part.set((part.value + 1) % part.limit)}
            >
              <ChevronUp />
            </Button>
            <input
              role="spinbutton"
              type="text"
              inputMode="none"
              value={twoDigits(part.value)}
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                const value = event.target.value
                if (/^\d{0,3}$/.test(value) && Number(value) < part.limit) part.set(Number(value))
              }}
              aria-label={part.label}
              aria-valuemin={0}
              aria-valuemax={part.limit - 1}
              aria-valuenow={part.value}
              aria-valuetext={twoDigits(part.value)}
              onKeyDown={(event) => {
                const next = {
                  ArrowUp: (part.value + 1) % part.limit,
                  ArrowDown: (part.value + part.limit - 1) % part.limit,
                  PageUp: (part.value + 5) % part.limit,
                  PageDown: (part.value + part.limit - 5) % part.limit,
                  Home: 0,
                  End: part.limit - 1,
                }[event.key]
                if (next === undefined) return
                event.preventDefault()
                part.set(next)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Decrease ${part.label.toLowerCase()}`}
              onClick={() => part.set((part.value + part.limit - 1) % part.limit)}
            >
              <ChevronDown />
            </Button>
          </div>
        ))}
      </div>
      <fieldset className="time-picker-presets" aria-label="Quick minutes">
        {[0, 15, 30, 45].map((value) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            aria-label={`${value} minutes`}
            aria-pressed={minute === value}
            onClick={() => setMinute(value)}
          >
            :{twoDigits(value)}
          </Button>
        ))}
      </fieldset>
      <div className="time-picker-actions">
        <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
        <Button type="button" className="candy-button" onClick={() => onConfirm(time)}>
          Set {time} <Check />
        </Button>
      </div>
    </DialogContent>
  )
}

export default function TimePicker({
  pill,
  value,
  invalid,
  onChange,
}: {
  pill: CatalogPill
  value: string
  invalid: boolean
  onChange: (time: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" className="plan-time-trigger" />}
        id={`time-${pill.id}`}
        aria-label={`${pill.name} time${value ? `, ${value}` : ', choose time'}`}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'schedule-error' : undefined}
      >
        <span data-placeholder={!value || undefined}>{value || 'Choose time'}</span>
        <Clock3 />
      </DialogTrigger>
      {open && (
        <TimeSelection
          pill={pill}
          value={value}
          onConfirm={(time) => {
            onChange(time)
            setOpen(false)
          }}
        />
      )}
    </Dialog>
  )
}
