import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Artwork } from '@/components/artwork'
import { Button } from '@/components/ui/button'
import { usePlayerSetup } from '../hooks/usePlayerSetup'
import { isScheduleComplete } from '../helpers'
import TimePicker from './TimePicker'

export default function Schedule({ onNext }: { onNext: () => void }) {
  const { patientName, selectedPills, pills, schedules, updateSchedule } = usePlayerSetup()
  const selected = pills.filter((pill) => selectedPills.includes(pill.id))
  const [index, setIndex] = useState(0)
  const [showError, setShowError] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const page = Math.min(index, selected.length - 1)
  const pill = selected[page]
  if (!pill) return null
  const schedule = schedules[pill.id]
  const lastPage = page === selected.length - 1

  function goToPage(next: number) {
    setIndex(next)
    setShowError(false)
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
  }

  return (
    <form
      className="setup-form schedule-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!schedule?.time) {
          setShowError(true)
          document.getElementById(`time-${pill.id}`)?.focus({ preventScroll: true })
          return
        }
        if (!lastPage) {
          goToPage(page + 1)
          return
        }
        const incomplete = selected.findIndex((item) => !isScheduleComplete(schedules[item.id]))
        if (incomplete !== -1) {
          goToPage(incomplete)
          setShowError(true)
          return
        }
        onNext()
      }}
    >
      <header className="setup-heading">
        <h1>Your pill plan</h1>
        <span className="demo-badge">DEMO · Staff setup</span>
        <p className="schedule-intro">Times & quantities for {patientName}</p>
      </header>
      <p className="plan-note">
        Enter the details from the patient’s prescribed plan. This demo does not send reminders or
        save a medical record.
      </p>
      <section className="schedule-card" key={pill.id} aria-label={pill.name}>
        <div className="schedule-pill">
          <Artwork source="pills" crop={pill.crop} />
          <h2 ref={heading} tabIndex={-1}>
            {pill.name}
          </h2>
        </div>
        <div className="schedule-fields">
          <div className="schedule-time-field">
            <label htmlFor={`time-${pill.id}`}>Time</label>
            <TimePicker
              pill={pill}
              value={schedule?.time ?? ''}
              invalid={showError && !schedule?.time}
              onChange={(time) => {
                updateSchedule(pill.id, { time })
                setShowError(false)
              }}
            />
          </div>
          <label>
            Quantity (pills)
            <input
              aria-label={`${pill.name} quantity`}
              type="number"
              inputMode="decimal"
              min="0.25"
              step="0.25"
              required
              placeholder="e.g. 1"
              value={schedules[pill.id]?.quantity ?? ''}
              onChange={(e) => updateSchedule(pill.id, { quantity: e.target.value })}
            />
          </label>
        </div>
        <p id="schedule-error" className="schedule-error" role={showError ? 'alert' : undefined}>
          {showError ? 'Choose a time and enter the prescribed quantity.' : '\u00a0'}
        </p>
      </section>
      <div className="schedule-pagination">
        <Button
          type="button"
          variant="ghost"
          disabled={page === 0}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <output aria-live="polite">
          Pill {page + 1} of {selected.length}
        </output>
      </div>
      <div className="setup-footer">
        <Button type="submit" className="candy-button">
          {lastPage ? 'Let’s play!' : 'Next pill'} <ChevronRight />
        </Button>
        <span className="footer-caption">Your next little adventure is ready</span>
      </div>
    </form>
  )
}
