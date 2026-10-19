export const DEMO_ROLES = [
  { id: 'patient', name: 'Patient', detail: 'Check in, play & collect a reward', icon: 'patient' },
  {
    id: 'medical',
    name: 'Medical team',
    detail: 'Nurses, doctors & care team · set a sample plan',
    icon: 'staff',
  },
  { id: 'parent', name: 'Parent', detail: 'Choose prizes & cheer on your child', icon: 'parents' },
] as const
export const ROOM_PATTERN = /^[A-Z2-9]{8}$/
export const DEMO_PATIENT = 'Ariel'
