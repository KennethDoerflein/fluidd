import { encodeGcodeParamValue } from '@/util/gcode-helpers'

export interface FilamentBoxProfile {
  material: string
  color: string
  brand: string
  name: string
}

export const DEFAULT_PROFILE: FilamentBoxProfile = {
  material: '--',
  color: '#6F7379',
  brand: '',
  name: ''
}

export const normalizeMaterial = (material?: string | null): string => {
  return (material ?? '').trim().toUpperCase()
}

export const normalizeColor = (color?: string | null, fallback = DEFAULT_PROFILE.color): string => {
  const normalized = (color ?? '').trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback
}

export const formatStatusCode = (code?: number | null): string => {
  return code == null ? 'Unknown' : `0x${code.toString(16).padStart(2, '0')}`
}

export const formatStateText = (
  name?: string | null,
  code?: number | null,
  includeCode = (code != null && code !== 0)
): string => {
  const trimmed = name?.trim()
  const title = trimmed
    ? (trimmed === 'OK'
        ? trimmed
        : trimmed.toLowerCase().split('_').filter(Boolean).map(part => `${part[0].toUpperCase()}${part.slice(1)}`).join(' '))
    : null
  if (title == null) {
    return formatStatusCode(code)
  }
  return includeCode && code != null ? `${title} (${formatStatusCode(code)})` : title
}

export interface MaterialOption {
  key: string
  targetTemp: number
}

export const formatMaterials = (materials: Record<string, { target_temp: number }>): MaterialOption[] => {
  return Object.entries(materials ?? {})
    .map(([key, item]) => ({
      key: normalizeMaterial(key),
      targetTemp: item.target_temp
    }))
    .filter(item => item.key !== '')
    .sort((a, b) => a.key.localeCompare(b.key))
}

export const clampPercent = (percent: number): number => {
  return Math.max(0, Math.min(100, Math.round(percent)))
}

export interface SlotUsage {
  label: string
  percent: number | null
}

export const formatUsage = (slot: any, spool?: any): SlotUsage | null => {
  if (slot.spoolman_id != null) {
    if (!spool) return null
    const remainingWeight = spool.remaining_weight
    const initialWeight = spool.initial_weight
    if (remainingWeight != null && Number.isFinite(remainingWeight)) {
      const percent = (initialWeight != null && Number.isFinite(initialWeight) && initialWeight > 0)
        ? clampPercent((remainingWeight / initialWeight) * 100)
        : null
      return {
        label: (initialWeight != null && Number.isFinite(initialWeight))
          ? `${Math.round(remainingWeight)}g/${Math.round(initialWeight)}g`
          : `${Math.round(remainingWeight)}g`,
        percent
      }
    }
    return (spool.remaining_length != null && Number.isFinite(spool.remaining_length))
      ? {
          label: `${Math.round(spool.remaining_length / 1000)}m`,
          percent: null
        }
      : null
  }
  if (slot.rfid_percent == null || !Number.isFinite(slot.rfid_percent)) {
    return null
  }
  const percent = clampPercent(slot.rfid_percent)
  return {
    label: `${percent}%`,
    percent
  }
}

export interface FormattedSlot extends FilamentBoxProfile {
  index: number
  external: boolean
  present: boolean
  loaded: boolean
  interactive: boolean
  hasSnapshot: boolean
  state: 'loaded' | 'ready' | 'unloaded' | 'unknown'
  usage: SlotUsage | null
}

export const formatSlot = (slot: any, dataReady: boolean, spool?: any): FormattedSlot => {
  const present = dataReady && Boolean(slot.present)
  const loaded = dataReady && Boolean(slot.loaded)
  const interactive = dataReady
  const hasProfile = Boolean(
    (slot.material && normalizeMaterial(slot.material) !== '' && normalizeMaterial(slot.material) !== '--') ||
    slot.brand ||
    slot.name ||
    slot.spoolman_id != null
  )
  const hasSnapshot = dataReady && (slot.external || present || hasProfile)
  const profile: FilamentBoxProfile = hasProfile || hasSnapshot
    ? {
        material: normalizeMaterial(slot.material) || DEFAULT_PROFILE.material,
        color: normalizeColor(slot.color),
        brand: slot.brand ?? '',
        name: slot.name ?? ''
      }
    : DEFAULT_PROFILE
  const state: 'loaded' | 'ready' | 'unloaded' | 'unknown' = dataReady
    ? (loaded ? 'loaded' : (slot.external || present) ? 'ready' : 'unloaded')
    : 'unknown'

  return {
    ...profile,
    index: slot.index,
    external: slot.external,
    present,
    loaded,
    interactive,
    hasSnapshot,
    state,
    usage: hasSnapshot ? formatUsage(slot, spool) : null
  }
}

export const formatSlotRange = (slots: Array<{ index: number }>): string => {
  if (slots.length === 0) return ''
  if (slots.length === 1) return `T${slots[0].index}`
  return `T${slots[0].index}-T${slots[slots.length - 1].index}`
}

export interface SlotGroup {
  key: string
  label: string
  range: string
  external: boolean
  slots: FormattedSlot[]
}

export const groupSlots = (slots: FormattedSlot[]): SlotGroup[] => {
  const externalSlots = slots.filter(slot => slot.external)
  const boxSlots = slots.filter(slot => !slot.external)
  const groups: SlotGroup[] = []

  if (externalSlots.length > 0) {
    groups.push({
      key: 'external',
      label: 'External',
      range: externalSlots.map(s => `T${s.index}`).join(', '),
      external: true,
      slots: externalSlots
    })
  }

  for (let i = 0; i < boxSlots.length; i += 4) {
    const chunk = boxSlots.slice(i, i + 4)
    const boxNumber = (i / 4) + 1
    groups.push({
      key: `box-${boxNumber}`,
      label: `Box ${boxNumber}`,
      range: formatSlotRange(chunk),
      external: false,
      slots: chunk
    })
  }

  return groups
}

export const formatMaterialCommand = (material: string, targetTemp: number): string => {
  return `_BOX_MATERIAL_SET MATERIAL=${encodeGcodeParamValue(normalizeMaterial(material))} TARGET_TEMP=${Math.round(targetTemp)}`
}

export interface SlotSetOptions {
  spoolmanSupported?: boolean
  spoolmanId?: number | null
}

export const formatSlotCommand = (
  slotIndex: number,
  profile: FilamentBoxProfile,
  options: SlotSetOptions = {}
): string => {
  const params = [
    `SLOT=${slotIndex}`,
    `MATERIAL=${encodeGcodeParamValue(normalizeMaterial(profile.material))}`,
    `COLOR=${encodeGcodeParamValue(normalizeColor(profile.color))}`,
    `BRAND=${encodeGcodeParamValue((profile.brand ?? '').trim())}`,
    `NAME=${encodeGcodeParamValue((profile.name ?? '').trim())}`
  ]

  if (options.spoolmanSupported) {
    params.push(`SPOOLMAN_ID=${options.spoolmanId ?? -1}`)
  }

  return `_BOX_SLOT_SET ${params.join(' ')}`
}

export const formatSlotClearCommand = (slotIndex: number | 'ALL'): string => {
  return `_BOX_SLOT_CLEAR SLOT=${slotIndex}`
}

export const COLOR_SWATCHES = [
  { labelKey: 'app.filament_box.color.black', color: '#111111' },
  { labelKey: 'app.filament_box.color.white', color: '#F2F2F2' },
  { labelKey: 'app.filament_box.color.gray', color: '#6F7379' },
  { labelKey: 'app.filament_box.color.red', color: '#D74242' },
  { labelKey: 'app.filament_box.color.orange', color: '#DF7A32' },
  { labelKey: 'app.filament_box.color.yellow', color: '#E0BC32' },
  { labelKey: 'app.filament_box.color.green', color: '#4E9F48' },
  { labelKey: 'app.filament_box.color.blue', color: '#2F75D6' },
  { labelKey: 'app.filament_box.color.purple', color: '#7C5BD6' },
  { labelKey: 'app.filament_box.color.pink', color: '#D75BA7' },
  { labelKey: 'app.filament_box.color.brown', color: '#8A5A3B' },
  { labelKey: 'app.filament_box.color.natural', color: '#D6C8A8' }
]
