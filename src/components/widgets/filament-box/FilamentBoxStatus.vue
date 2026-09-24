<template>
  <div class="filament-box-status">
    <div class="status-strip">
      <v-chip
        small
        outlined
        class="status-chip"
        :class="statusChipClasses"
        :title="statusDetail"
        data-test="filament-box-status"
      >
        <span class="status-chip-label">{{ $t('app.filament_box.label.status') }}</span>
        <span class="status-chip-value">{{ statusDisplay }}</span>
      </v-chip>

      <v-chip
        v-if="dataReady"
        small
        outlined
        class="status-chip mode-chip"
        :title="modeDetail"
      >
        <span class="status-chip-label">{{ $t('app.filament_box.label.mode') }}</span>
        <span class="status-chip-value">{{ modeDisplay }}</span>
      </v-chip>

      <v-chip
        small
        outlined
        class="status-chip environment-chip"
        :aria-label="environmentLabel"
      >
        <v-icon
          small
          color="info"
        >
          $mmuTemp
        </v-icon>
        <span>{{ formattedTemp }}</span>
        <span class="environment-separator">·</span>
        <v-icon
          small
          color="info"
        >
          $mmuHumidity
        </v-icon>
        <span>{{ formattedHumidity }}</span>
      </v-chip>

      <v-chip
        v-if="dataReady && clogDetection"
        small
        outlined
        class="status-chip clog-detection-chip"
        :class="clogDetectionClasses"
      >
        <span class="clog-detection-dot" />
        <span class="status-chip-label">{{ $t('app.filament_box.label.clog_detection') }}</span>
        <span class="status-chip-value">{{ clogDetectionLabel }}</span>
      </v-chip>
    </div>

    <div
      v-if="routingEntries.length > 0"
      class="print-routing"
      data-test="filament-box-print-routing"
    >
      <span class="print-routing-label">{{ $t('app.filament_box.label.print_routing') }}</span>
      <v-chip
        v-for="entry in routingEntries"
        :key="entry.tool"
        x-small
        outlined
        class="print-routing-chip"
      >
        {{ entry.label }}
      </v-chip>
    </div>

    <div class="load-path-diagram">
      <div
        class="path-node source"
        :class="{ active: sourceActive }"
      >
        <span class="path-node-label">{{ $t('app.filament_box.label.slot') }}</span>
        <span class="path-node-value">{{ sourceLabel }}</span>
      </div>

      <div
        class="path-segment"
        :class="{ active: encoderActive }"
      />

      <div
        class="path-node"
        :class="{ active: encoderActive }"
      >
        <span class="path-node-label">{{ $t('app.filament_box.label.encoder') }}</span>
        <span class="path-node-value">{{ encoderLabel }}</span>
      </div>

      <div
        class="path-segment"
        :class="{ active: bufferActive }"
      />

      <div
        class="path-node"
        :class="{ active: bufferActive }"
      >
        <span class="path-node-label">{{ $t('app.filament_box.label.buffer') }}</span>
        <span class="path-node-value">{{ bufferLabel }}</span>
      </div>

      <div
        class="path-segment"
        :class="{ active: printheadActive }"
      />

      <div
        class="path-node"
        :class="{ active: printheadActive }"
      >
        <span class="path-node-label">{{ $t('app.filament_box.label.printhead') }}</span>
        <span class="path-node-value">{{ printheadLabel }}</span>
      </div>

      <div class="load-path-actions">
        <v-btn
          class="filament-action-btn"
          x-small
          outlined
          color="warning"
          :disabled="!canUnload"
          data-test="filament-box-unload"
          @click="$emit('unload')"
        >
          <v-icon
            left
            x-small
          >
            $mmuUnload
          </v-icon>
          {{ $t('app.filament_box.btn.unload') }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { formatStateText } from './types'

@Component({})
export default class FilamentBoxStatus extends Vue {
  @Prop({ default: null })
  readonly box!: any

  @Prop({ default: null })
  readonly printheadDetected!: boolean | null

  @Prop({ type: Boolean, required: true })
  readonly canUnload!: boolean

  get dataReady (): boolean {
    return this.box?.data_ready === true
  }

  get loadPath () {
    return this.box?.load_path ?? null
  }

  get clogDetection () {
    return this.loadPath?.clog_detection ?? null
  }

  get statusDisplay (): string {
    return this.dataReady
      ? formatStateText(this.box?.status ?? null, this.box?.status_code ?? null)
      : String(this.$t('app.filament_box.state.connecting'))
  }

  get modeDisplay (): string {
    return formatStateText(this.box?.state ?? null, this.box?.state_code ?? null, false)
  }

  get statusDetail (): string {
    return this.dataReady
      ? formatStateText(this.box?.status ?? null, this.box?.status_code ?? null, true)
      : String(this.$t('app.filament_box.msg.waiting_for_data'))
  }

  get modeDetail (): string {
    return formatStateText(this.box?.state ?? null, this.box?.state_code ?? null, true)
  }

  get routingEntries (): Array<{ tool: number; label: string }> {
    const routing = this.box?.tool_routing
    if (routing == null || typeof routing !== 'object') return []

    return Object.entries(routing)
      .map(([tool, slot]) => ({
        tool: Number(tool),
        label: `T${tool} -> ${this.slotLabel(Number(slot))}`
      }))
      .sort((a, b) => a.tool - b.tool)
  }

  slotLabel (slot: number): string {
    const slotData = (this.box?.slots ?? []).find((item: any) => item.index === slot)
    if (slotData?.external === true) return `External T${slot}`
    const letter = slot < 26 ? String.fromCharCode(65 + (slot % 4)) : String(slot)
    return `CFS ${letter} (T${slot})`
  }

  get statusChipClasses () {
    return {
      ok: this.dataReady && this.box?.status_code === 0,
      issue: this.dataReady && this.box?.status_code != null && this.box.status_code !== 0
    }
  }

  get formattedTemp (): string {
    return !this.dataReady || this.box?.temp_c == null ? '--°C' : `${this.box.temp_c}°C`
  }

  get formattedHumidity (): string {
    return !this.dataReady || this.box?.humidity_pct == null ? '--% RH' : `${this.box.humidity_pct}% RH`
  }

  get environmentLabel (): string {
    return String(this.$t('app.filament_box.label.environment', {
      temperature: this.formattedTemp,
      humidity: this.formattedHumidity
    }))
  }

  get sourceActive (): boolean {
    return this.dataReady && this.loadPath?.source_slot != null && this.loadPath.source_slot >= 0
  }

  get encoderActive (): boolean {
    return this.sourceActive && this.loadPath?.tracking_active === true
  }

  get bufferActive (): boolean {
    const code = this.loadPath?.buffer?.state_code
    return this.sourceActive && this.loadPath?.box_addr != null && (code === 0 || code === 1)
  }

  get printheadActive (): boolean {
    return this.sourceActive && this.printheadDetected === true
  }

  get sourceLabel (): string {
    if (!this.dataReady || this.loadPath?.source_slot == null || this.loadPath.source_slot < 0) {
      return '--'
    }
    const slot = this.loadPath.source_slot
    if (slot === 4) {
      return 'Ext (T4)'
    }
    const letter = slot < 26 ? String.fromCharCode(65 + (slot % 4)) : `${slot}`
    return `CFS ${letter} (T${slot})`
  }

  get encoderLabel (): string {
    const pos = this.loadPath?.encoder?.position_mm
    return !this.dataReady || pos == null
      ? '--'
      : `${(Math.abs(pos) < 0.05 ? 0 : pos).toFixed(1)}mm`
  }

  get bufferLabel (): string {
    if (!this.dataReady) return '--'
    switch (this.loadPath?.buffer?.state_code) {
      case 0:
        return String(this.$t('app.filament_box.state.middle'))
      case 1:
        return String(this.$t('app.filament_box.state.full'))
      case 2:
        return String(this.$t('app.filament_box.state.empty'))
      default:
        return String(this.$t('app.filament_box.state.unknown'))
    }
  }

  get printheadLabel (): string {
    if (!this.dataReady) return '--'
    if (this.printheadDetected == null) {
      return String(this.$t('app.filament_box.state.unknown'))
    }
    return String(this.$t(this.printheadDetected ? 'app.filament_box.state.triggered' : 'app.filament_box.state.not_triggered'))
  }

  get clogDetectionClasses () {
    const state = this.clogDetection?.state
    return {
      active: state === 'active' && !this.clogDetection?.triggered,
      triggered: this.clogDetection?.triggered === true || state === 'triggered',
      disabled: state === 'disabled',
      inactive: state === 'inactive' || state === 'disabled'
    }
  }

  get clogDetectionLabel (): string {
    if (this.clogDetection?.triggered || this.clogDetection?.state === 'triggered') {
      return String(this.$t('app.filament_box.state.triggered'))
    }
    return String(this.$t(`app.filament_box.state.${this.clogDetection?.state ?? 'inactive'}`))
  }
}
</script>

<style lang="scss" scoped>
.filament-box-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: rgba(255, 255, 255, 0.03) !important;

  ::v-deep .v-chip__content {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  &.ok {
    color: #81c784;
    border-color: rgba(76, 175, 80, 0.35) !important;
  }

  &.issue {
    color: #e57373;
    border-color: rgba(244, 67, 54, 0.35) !important;
  }
}

.status-chip-label {
  color: var(--v-secondary-lighten1);
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.status-chip-value {
  font-weight: 800;
}

.print-routing {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.print-routing-label {
  color: var(--v-secondary-lighten1);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
}

.print-routing-chip {
  color: var(--v-info-base);
  border-color: rgba(33, 150, 243, 0.35) !important;
}

.mode-chip {
  color: var(--v-info-base);
}

.environment-chip {
  color: var(--v-secondary-lighten1);
  font-weight: 700;
}

.environment-separator {
  color: var(--v-secondary-lighten2);
}

.clog-detection-chip {
  &.active {
    color: #81c784;
    border-color: rgba(76, 175, 80, 0.35) !important;
  }

  &.triggered {
    color: #e57373;
    border-color: rgba(244, 67, 54, 0.35) !important;
  }

  &.inactive,
  &.disabled {
    color: var(--v-secondary-lighten2);
  }
}

.clog-detection-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--v-secondary-lighten2);
}

.clog-detection-chip.active .clog-detection-dot {
  background: #81c784;
}

.clog-detection-chip.triggered .clog-detection-dot {
  background: #e57373;
}

.load-path-diagram {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
}

.path-node {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  height: 58px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: all 0.15s ease;

  &.active {
    background: rgba(255, 152, 0, 0.12);
    border-color: rgba(255, 152, 0, 0.6);
    box-shadow: 0 0 10px rgba(255, 152, 0, 0.15);

    .path-node-value {
      color: var(--v-warning-base, #ff9800);
    }
  }
}

.path-node-label,
.path-node-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-node-label {
  color: var(--v-secondary-lighten2);
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.path-node-value {
  margin-top: 4px;
  color: var(--v-secondary-lighten1);
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.1;
}

.path-segment {
  display: none;
}

.load-path-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
  margin-top: 2px;
}

.filament-action-btn {
  min-width: 72px;
  height: 24px !important;
}
</style>
