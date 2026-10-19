import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Prize } from '../types'

interface Props {
  existing: Prize[]
  onAdd: (prize: Prize) => void
  onCancel: () => void
}

export default function CustomPrizeForm({ existing, onAdd, onCancel }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  return (
    <form
      className="custom-prize-form"
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
          setError('Give your prize a name.')
          return
        }
        if (
          existing.some((prize) => prize.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
        ) {
          setError('That prize is already in the list.')
          return
        }
        onAdd({ id: `custom-${crypto.randomUUID()}`, name: trimmed })
      }}
    >
      <label htmlFor="custom-prize">Something they love</label>
      <div>
        <input
          id="custom-prize"
          value={name}
          maxLength={60}
          placeholder="e.g. A picnic together"
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
          aria-describedby={error ? 'custom-prize-error' : undefined}
          aria-invalid={Boolean(error)}
        />
        <Button type="submit" aria-label="Add custom prize">
          <Plus />
        </Button>
      </div>
      {error && (
        <p id="custom-prize-error" role="alert">
          {error}
        </p>
      )}
      <Button variant="link" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  )
}
