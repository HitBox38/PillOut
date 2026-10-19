export interface PatientOption {
  id: number | string
  name: string
  detail?: string
}
export interface SearchResults {
  items: PatientOption[]
  has_more: boolean
}
export interface Props {
  onSelect: (patient: PatientOption) => void
  onCancel: () => void
  patients?: PatientOption[]
}
