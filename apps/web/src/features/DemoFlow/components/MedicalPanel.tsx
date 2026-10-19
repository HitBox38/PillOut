import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Artwork } from '@/components/artwork'
import { PILLS } from '@/features/PlayerSetup/constants'
import type { DemoCommand, DemoRoom } from '../types'
import PatientSearch from '@/features/PatientSearch'

interface Props {
  room: DemoRoom
  pending: boolean
  send: (command: DemoCommand) => Promise<boolean>
}
export default function MedicalPanel({ room, pending, send }: Props) {
  const [medicines, setMedicines] = useState(room.medicines)
  const [time, setTime] = useState(room.time)
  const [page, setPage] = useState(0)
  const [findingPatient, setFindingPatient] = useState(false)
  const saved =
    medicines.length > 0 && medicines.join(',') === room.medicines.join(',') && time === room.time
  if (findingPatient)
    return (
      <PatientSearch
        patients={[{ id: room.room, name: 'Ariel', detail: `Sample patient · Room ${room.room}` }]}
        onCancel={() => setFindingPatient(false)}
        onSelect={() => setFindingPatient(false)}
      />
    )
  return (
    <form
      className="demo-panel"
      onSubmit={(event) => {
        event.preventDefault()
        void send({ action: 'plan', role: 'medical', medicines, time })
      }}
    >
      <div className="demo-medical-heading">
        <h2>Choose pills</h2>
        <Button onClick={() => setFindingPatient(true)}>Find patient</Button>
      </div>
      <fieldset className="demo-medicines">
        <legend className="sr-only">Sample medicines</legend>
        {PILLS.slice(page * 3, page * 3 + 3).map((pill) => (
          <label
            className="demo-medicine"
            key={pill.id}
            data-selected={medicines.includes(pill.id)}
          >
            <input
              type="checkbox"
              checked={medicines.includes(pill.id)}
              disabled={!medicines.includes(pill.id) && medicines.length === 3}
              onChange={() => {
                setMedicines(
                  medicines.includes(pill.id)
                    ? medicines.filter((id) => id !== pill.id)
                    : [...medicines, pill.id],
                )
              }}
            />
            <Artwork source="pills" crop={pill.crop} />
            <span>{pill.name}</span>
            {medicines.includes(pill.id) && <Check size={16} aria-hidden="true" />}
          </label>
        ))}
      </fieldset>
      <div className="demo-pager">
        <Button
          aria-label="Previous medicines"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <span>
          {medicines.length}/3 selected · {page + 1}/3
        </span>
        <Button aria-label="Next medicines" disabled={page === 2} onClick={() => setPage(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
      <label className="demo-time">
        Demo time
        <input
          aria-label="Demo time"
          type="time"
          required
          value={time}
          onChange={(event) => {
            setTime(event.target.value)
          }}
        />
      </label>
      <Button type="submit" className="candy-button" disabled={pending || medicines.length === 0}>
        {pending ? 'Publishing…' : saved ? 'Plan published ✓' : 'Publish sample plan'}
      </Button>
    </form>
  )
}
