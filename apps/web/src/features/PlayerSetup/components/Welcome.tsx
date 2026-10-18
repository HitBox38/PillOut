/* oxlint-disable jsx-a11y/autocomplete-valid -- given-name, family-name, and nickname are standard HTML autofill tokens. */
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { usePlayerSetup } from '../hooks/usePlayerSetup'
import { useWelcome } from '../hooks/useWelcome'
import CatalogStatus from './CatalogStatus'

export default function Welcome({ onNext }: { onNext: () => void }) {
  const { name, surname, nickname, avatar, avatars, catalogStatus, saveStatus, saveError, update } =
    usePlayerSetup()
  const submit = useWelcome(onNext)
  const saving = saveStatus === 'saving'
  return (
    <form
      className="setup-form welcome-form"
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
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
            disabled={saving}
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
            disabled={saving}
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
            disabled={saving}
            onChange={(e) => update({ nickname: e.target.value })}
            pattern=".*\S.*"
            aria-describedby="nickname-help"
          />
        </label>
        <p id="nickname-help" className="field-help">
          Other players will see your nickname
        </p>
      </div>
      <fieldset className="avatar-picker" disabled={saving || catalogStatus !== 'ready'}>
        <legend>Choose your avatar</legend>
        <div className="avatar-grid">
          {avatars.map((option) => (
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
        <CatalogStatus />
        {saveError && <p role="alert">{saveError}</p>}
        <Button
          type="submit"
          className="candy-button"
          disabled={saving || catalogStatus !== 'ready'}
        >
          {saving ? 'Saving your player…' : 'Save player & continue'} <ChevronRight />
        </Button>
        <span className="footer-caption">Your player details and avatar will be saved.</span>
      </div>
    </form>
  )
}
