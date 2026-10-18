export const MEDICINE_IDS = [
  'mercaptopurine',
  'methotrexate',
  'thioguanine',
  'imatinib',
  'dasatinib',
  'temozolomide',
  'cyclophosphamide',
  'etoposide',
  'isotretinoin',
] as const

export type MedicineId = (typeof MEDICINE_IDS)[number]
