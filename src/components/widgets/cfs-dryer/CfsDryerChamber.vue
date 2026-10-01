<template>
  <div
    class="dryer-chamber"
    :class="chamberClasses"
  >
    <div class="chamber-header">
      <div class="chamber-title-wrap">
        <span class="chamber-name font-weight-bold">{{ chamberName }}</span>
        <span class="chamber-slots text-caption text--secondary font-weight-medium">{{ slotsLabel }}</span>
      </div>
      <v-chip
        x-small
        outlined
        class="chamber-status-chip"
        :class="{ heating: chamber.heating }"
      >
        <span class="status-dot" />
        {{ chamber.heating ? $t('app.cfs_dryer.state.heating') : $t('app.cfs_dryer.state.idle') }}
      </v-chip>
    </div>

    <div class="chamber-body">
      <div class="temp-readout">
        <div class="current-temp">
          <span class="temp-value">{{ currentTempDisplay }}</span>
          <span class="temp-unit">°C</span>
        </div>
        <div class="target-temp text-caption text--secondary">
          {{ $t('app.cfs_dryer.label.target') }}:
          <span class="font-weight-medium">{{ targetTempDisplay }}</span>
        </div>
      </div>

      <div class="timer-readout">
        <div class="timer-label text-caption text--secondary">
          <v-icon x-small left>
            $clock
          </v-icon>
          {{ $t('app.cfs_dryer.label.remaining') }}
        </div>
        <div class="timer-value font-weight-bold">
          {{ timeRemainingDisplay }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { formatDuration, type ChamberTelemetry } from './types'

@Component({})
export default class CfsDryerChamber extends Vue {
  @Prop({ required: true })
  readonly chamber!: ChamberTelemetry

  @Prop({ type: String, required: true })
  readonly side!: 'left' | 'right'

  @Prop({ type: Number, default: 1 })
  readonly boxNumber!: number

  get isLeft (): boolean {
    return this.side === 'left'
  }

  get chamberName (): string {
    return this.isLeft
      ? String(this.$t('app.cfs_dryer.label.left_chamber'))
      : String(this.$t('app.cfs_dryer.label.right_chamber'))
  }

  get slotsLabel (): string {
    const baseSlot = (this.boxNumber - 1) * 4
    if (this.isLeft) {
      return `T${baseSlot}-T${baseSlot + 1} (A-B)`
    }
    return `T${baseSlot + 2}-T${baseSlot + 3} (C-D)`
  }

  get currentTempDisplay (): string {
    return this.chamber.cur_temp != null ? String(this.chamber.cur_temp) : '--'
  }

  get targetTempDisplay (): string {
    return this.chamber.target_temp > 0 ? `${this.chamber.target_temp}°C` : '--'
  }

  get timeRemainingDisplay (): string {
    return formatDuration(this.chamber.remaining_time)
  }

  get chamberClasses () {
    return {
      'is-heating': this.chamber.heating,
      'side-left': this.isLeft,
      'side-right': !this.isLeft
    }
  }
}
</script>

<style lang="scss" scoped>
.dryer-chamber {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;

  &.is-heating {
    background: rgba(255, 152, 0, 0.06);
    border-color: rgba(255, 152, 0, 0.5);
    box-shadow: 0 0 12px rgba(255, 152, 0, 0.12);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #ff9800, #ff5722);
    }
  }
}

.chamber-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chamber-title-wrap {
  display: flex;
  flex-direction: column;
}

.chamber-name {
  font-size: 0.85rem;
  line-height: 1.2;
}

.chamber-slots {
  font-size: 0.72rem;
  opacity: 0.8;
}

.chamber-status-chip {
  height: 20px !important;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 4px;
    background: var(--v-secondary-lighten2, #888);
  }

  &.heating {
    color: #ff9800 !important;
    border-color: rgba(255, 152, 0, 0.5) !important;

    .status-dot {
      background: #ff9800;
      box-shadow: 0 0 6px #ff9800;
      animation: pulse-glow 1.6s ease-in-out infinite;
    }
  }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.2); }
}

.chamber-body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4px;
}

.temp-readout {
  display: flex;
  flex-direction: column;
}

.current-temp {
  display: flex;
  align-items: baseline;
  line-height: 1;

  .temp-value {
    font-size: 1.8rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .temp-unit {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--v-secondary-lighten1);
    margin-left: 2px;
  }
}

.dryer-chamber.is-heating .current-temp .temp-value {
  color: #ff9800;
}

.target-temp {
  margin-top: 3px;
  font-size: 0.75rem;
}

.timer-readout {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.timer-label {
  font-size: 0.72rem;
  display: flex;
  align-items: center;
}

.timer-value {
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
</style>
