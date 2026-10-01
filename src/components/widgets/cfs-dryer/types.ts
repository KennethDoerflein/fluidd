export interface ChamberTelemetry {
  heating: boolean
  target_temp: number
  remaining_time: number
  cur_temp: number
}

export interface BoxDryerTelemetry {
  supported: boolean
  ac_connected: boolean
  auto_dry_enabled?: boolean
  auto_humidity_enabled?: boolean
  auto_humidity_threshold?: number
  ch0: ChamberTelemetry
  ch1: ChamberTelemetry
  boxes?: Record<string, {
    supported: boolean
    ac_connected: boolean
    ch0: ChamberTelemetry
    ch1: ChamberTelemetry
  }>
}

export interface MaterialPreset {
  name: string
  temp: number
  durationMinutes: number
}

export const DRYER_PRESETS: MaterialPreset[] = [
  { name: 'PLA', temp: 55, durationMinutes: 240 },
  { name: 'PETG', temp: 65, durationMinutes: 480 },
  { name: 'ABS', temp: 65, durationMinutes: 480 },
  { name: 'ASA', temp: 65, durationMinutes: 480 },
  { name: 'TPU', temp: 50, durationMinutes: 360 },
  { name: 'PA', temp: 70, durationMinutes: 720 },
  { name: 'PC', temp: 65, durationMinutes: 480 }
]

export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '--'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

export const formatSetDryCommand = (
  boxAddr: number,
  channelMask: number,
  temp: number,
  durationMinutes: number
): string => {
  const ch = channelMask === 1 ? '0' : (channelMask === 2 ? '1' : '2')
  return `_BOX_SET_DRY_MODE BOX=${boxAddr} CH=${ch} TEMP=${Math.round(temp)} TOTAL_TIME=${Math.round(durationMinutes)}`
}

export const formatPauseDryCommand = (
  boxAddr: number,
  channelMask: number
): string => {
  const ch = channelMask === 1 ? '0' : (channelMask === 2 ? '1' : '2')
  return `_BOX_PAUSE_DRY BOX=${boxAddr} CH=${ch}`
}

export const formatContinueDryCommand = (boxAddr: number): string => {
  return `_CONTINUE_PAUSE_DRY BOX=${boxAddr}`
}

export const formatAutoDryCommand = (enabled: boolean): string => {
  return `_BOX_SET_AUTO_DRY_MODE ENABLE=${enabled ? 1 : 0}`
}

export const formatAutoHumidityCommand = (enabled: boolean, threshold: number): string => {
  return `_BOX_SET_AUTO_HUMIDITY_MODE ENABLE=${enabled ? 1 : 0} THRESHOLD=${Math.round(threshold)}`
}
