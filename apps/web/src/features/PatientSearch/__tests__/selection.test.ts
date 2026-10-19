import { expect, it } from 'vitest'
import { usePlayerSetup } from '@/features/PlayerSetup/hooks/usePlayerSetup'
import { useGameStore } from '@/game/store'

it('switches the patient without carrying over another patient’s local plan or changing the player account', () => {
  usePlayerSetup.setState({
    userId: 10,
    patientId: 10,
    patientName: 'Ariel',
    selectedPills: ['imatinib'],
    schedules: { imatinib: { time: '09:00', quantity: '1' } },
  })
  useGameStore.getState().setMedicines(['imatinib'])
  usePlayerSetup.getState().selectPatient(20, 'Noa Cohen')
  expect(usePlayerSetup.getState()).toMatchObject({
    userId: 10,
    patientId: 20,
    patientName: 'Noa Cohen',
    selectedPills: [],
    schedules: {},
  })
  expect(useGameStore.getState().kinds).not.toContain('imatinib')
  usePlayerSetup.getState().togglePill('imatinib')
  usePlayerSetup.getState().selectPatient(20, 'Noa Cohen')
  expect(usePlayerSetup.getState().selectedPills).toEqual(['imatinib'])
})
