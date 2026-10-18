import { ChevronRight } from 'lucide-react'
import { Artwork } from '@/components/artwork'
import { Button } from '@/components/ui/button'
import { usePlayerSetup } from '../hooks/usePlayerSetup'

export default function Schedule({ onNext }: { onNext: () => void }) {
  const { patientName, selectedPills, pills, schedules, updateSchedule } = usePlayerSetup()
  return (
    <form
      className="setup-form"
      onSubmit={(event) => {
        event.preventDefault()
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
      <div className="schedule-list">
        {pills
          .filter((pill) => selectedPills.includes(pill.id))
          .map((pill) => (
            <section className="schedule-card" key={pill.id} aria-label={pill.name}>
              <div className="schedule-pill">
                <Artwork source="pills" crop={pill.crop} />
                <h2>{pill.name}</h2>
              </div>
              <div className="schedule-fields">
                <label>
                  Time
                  <input
                    aria-label={`${pill.name} time`}
                    type="time"
                    required
                    value={schedules[pill.id]?.time ?? ''}
                    onChange={(e) => updateSchedule(pill.id, { time: e.target.value })}
                  />
                </label>
                <label>
                  Quantity (pills)
                  <input
                    aria-label={`${pill.name} quantity`}
                    type="number"
                    min="0.25"
                    step="0.25"
                    required
                    placeholder="e.g. 1"
                    value={schedules[pill.id]?.quantity ?? ''}
                    onChange={(e) => updateSchedule(pill.id, { quantity: e.target.value })}
                  />
                </label>
              </div>
            </section>
          ))}
      </div>
      <div className="setup-footer">
        <Button type="submit" className="candy-button">
          Let’s play! <ChevronRight />
        </Button>
        <span className="footer-caption">Your next little adventure is ready</span>
      </div>
    </form>
  )
}
