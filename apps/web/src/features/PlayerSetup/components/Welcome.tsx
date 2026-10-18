/* oxlint-disable jsx-a11y/autocomplete-valid -- given-name, family-name, and nickname are standard HTML autofill tokens. */
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { AVATARS } from '../constants'
import { usePlayerSetup } from '../hooks/usePlayerSetup'

export default function Welcome({ onNext }: { onNext: () => void }) {
  const { name, surname, nickname, avatar, update } = usePlayerSetup()
  return (
    <form
      className="setup-form welcome-form"
      onSubmit={(event) => {
        event.preventDefault()
        onNext()
      }}
    >
      <header className="setup-heading">
        <h1>Welcome!</h1>
        <p>Let’s create your player</p>
      </header>
      <div className="player-fields">
        <label>
          Name
          <input
            autoComplete="given-name"
            placeholder="Enter your name"
            value={name}
            maxLength={40}
            required
            onChange={(e) => update({ name: e.target.value })}
            pattern=".*\S.*"
          />
        </label>
        <label>
          Surname
          <input
            autoComplete="family-name"
            placeholder="Enter your surname"
            value={surname}
            maxLength={40}
            required
            onChange={(e) => update({ surname: e.target.value })}
            pattern=".*\S.*"
          />
        </label>
        <label>
          Nickname
          <input
            autoComplete="nickname"
            placeholder="Choose a nickname"
            value={nickname}
            maxLength={24}
            required
            onChange={(e) => update({ nickname: e.target.value })}
            pattern=".*\S.*"
            aria-describedby="nickname-help"
          />
        </label>
        <p id="nickname-help" className="field-help">
          Other players will see your nickname
        </p>
      </div>
      <fieldset className="avatar-picker">
        <legend>Choose your avatar</legend>
        <div className="avatar-grid">
          {AVATARS.map((option) => (
            <Button
              key={option.id}
              type="button"
              className="selection-card avatar-card"
              aria-label={option.name}
              aria-pressed={avatar === option.id}
              onClick={() => update({ avatar: option.id })}
            >
              <Avatar avatar={option} />
              {avatar === option.id && (
                <span className="selection-check">
                  <Check />
                </span>
              )}
            </Button>
          ))}
        </div>
      </fieldset>
      <div className="setup-footer">
        <Button type="submit" className="candy-button">
          Let’s add your pill plan <ChevronRight />
        </Button>
        <span className="footer-caption">A little play. A little brighter day.</span>
      </div>
    </form>
  )
}
