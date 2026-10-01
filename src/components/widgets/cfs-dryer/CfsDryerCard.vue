<template>
  <collapsable-card
    :title="$t('app.cfs_dryer.title.cfs_dryer')"
    icon="$mmuHeater"
    draggable
    layout-path="dashboard.cfs-dryer-card"
  >
    <template #menu>
      <app-btn
        icon
        :disabled="!dryerSupported"
        @click="settingsDialogOpen = true"
      >
        <v-icon dense>
          $cog
        </v-icon>
      </app-btn>
    </template>

    <v-card-text class="cfs-dryer-body">
      <template v-if="dryerSupported">
        <!-- AC Power Alert if disconnected -->
        <v-alert
          v-if="!acConnected"
          dense
          text
          type="warning"
          class="mb-2 ac-alert"
        >
          <div class="d-flex align-center">
            <v-icon
              left
              small
              color="warning"
            >
              $alert
            </v-icon>
            <span class="text-caption font-weight-medium">
              {{ $t('app.cfs_dryer.msg.ac_disconnected') }}
            </span>
          </div>
        </v-alert>

        <!-- Status & Ambient Strip -->
        <div class="dryer-status-strip">
          <v-chip
            small
            outlined
            class="status-chip ac-chip"
            :class="{ connected: acConnected, disconnected: !acConnected }"
          >
            <v-icon x-small left>
              {{ acConnected ? '$check' : '$alert' }}
            </v-icon>
            <span class="status-chip-label">{{ $t('app.cfs_dryer.label.ac_power') }}</span>
            <span class="status-chip-value">
              {{ acConnected ? $t('app.cfs_dryer.state.connected') : $t('app.cfs_dryer.state.disconnected') }}
            </span>
          </v-chip>

          <v-chip
            v-if="ambientTemp != null"
            small
            outlined
            class="status-chip"
          >
            <v-icon
              x-small
              left
              color="info"
            >
              $mmuTemp
            </v-icon>
            <span>{{ ambientTemp }}°C</span>
          </v-chip>

          <v-chip
            v-if="ambientHumidity != null"
            small
            outlined
            class="status-chip"
          >
            <v-icon
              x-small
              left
              color="info"
            >
              $mmuHumidity
            </v-icon>
            <span>{{ ambientHumidity }}% RH</span>
          </v-chip>

          <v-chip
            v-if="isHeating"
            small
            outlined
            class="status-chip heating-chip"
          >
            <span class="heating-dot" />
            <span class="font-weight-bold">{{ $t('app.cfs_dryer.state.heating') }}</span>
          </v-chip>
        </div>

        <!-- Chambers Grid -->
        <div class="dryer-chambers-grid">
          <cfs-dryer-chamber
            :chamber="ch0"
            side="left"
            :box-number="boxAddr"
          />
          <cfs-dryer-chamber
            :chamber="ch1"
            side="right"
            :box-number="boxAddr"
          />
        </div>

        <!-- Quick Material Presets -->
        <div class="presets-section">
          <span class="presets-title text-caption text--secondary font-weight-bold">
            {{ $t('app.cfs_dryer.label.presets') }}
          </span>
          <div class="presets-chips">
            <v-chip
              v-for="preset in presets"
              :key="preset.name"
              x-small
              outlined
              class="preset-chip"
              @click="applyPreset(preset)"
            >
              {{ preset.name }} ({{ preset.temp }}°C)
            </v-chip>
          </div>
        </div>

        <!-- Controls Section -->
        <div class="dryer-controls">
          <!-- Chamber Channel Selection -->
          <div class="control-row">
            <span class="control-label text-caption text--secondary font-weight-medium">
              {{ $t('app.cfs_dryer.label.chamber') }}
            </span>
            <v-btn-toggle
              v-model="selectedChannel"
              mandatory
              dense
              class="channel-toggle"
            >
              <v-btn
                :value="3"
                small
              >
                {{ $t('app.cfs_dryer.label.both') }}
              </v-btn>
              <v-btn
                :value="1"
                small
              >
                {{ $t('app.cfs_dryer.label.left') }}
              </v-btn>
              <v-btn
                :value="2"
                small
              >
                {{ $t('app.cfs_dryer.label.right') }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- Target Temp Slider -->
          <div class="control-row">
            <span class="control-label text-caption text--secondary font-weight-medium">
              {{ $t('app.cfs_dryer.label.temp') }} ({{ targetTemp }}°C)
            </span>
            <v-slider
              v-model="targetTemp"
              :min="30"
              :max="75"
              :step="1"
              hide-details
              dense
              class="control-slider"
            />
          </div>

          <!-- Duration Hours Slider -->
          <div class="control-row">
            <span class="control-label text-caption text--secondary font-weight-medium">
              {{ $t('app.cfs_dryer.label.duration') }} ({{ durationHours }}h)
            </span>
            <v-slider
              v-model="durationHours"
              :min="1"
              :max="24"
              :step="0.5"
              hide-details
              dense
              class="control-slider"
            />
          </div>

          <!-- Action Buttons -->
          <div class="control-actions">
            <v-btn
              small
              color="primary"
              :disabled="!acConnected"
              class="action-btn"
              @click="startDrying"
            >
              <v-icon
                left
                small
              >
                $play
              </v-icon>
              {{ $t('app.cfs_dryer.btn.start') }}
            </v-btn>

            <v-btn
              v-if="isHeating"
              small
              outlined
              color="warning"
              class="action-btn"
              @click="pauseDrying"
            >
              <v-icon
                left
                small
              >
                $pause
              </v-icon>
              {{ $t('app.cfs_dryer.btn.pause') }}
            </v-btn>

            <v-btn
              v-if="hasPausedChamber"
              small
              outlined
              color="info"
              class="action-btn"
              @click="resumeDrying"
            >
              <v-icon
                left
                small
              >
                $resume
              </v-icon>
              {{ $t('app.cfs_dryer.btn.resume') }}
            </v-btn>

            <v-btn
              v-if="isHeating || hasPausedChamber"
              small
              outlined
              color="error"
              class="action-btn"
              @click="stopDrying"
            >
              <v-icon
                left
                small
              >
                $stop
              </v-icon>
              {{ $t('app.cfs_dryer.btn.stop') }}
            </v-btn>
          </div>
        </div>
      </template>

      <!-- Not supported / offline message -->
      <div
        v-else
        class="py-4 text-center secondary--text text-caption"
      >
        <v-icon
          large
          color="secondary"
          class="mb-2 d-block mx-auto opacity-50"
        >
          $mmuHeater
        </v-icon>
        {{ $t('app.cfs_dryer.state.not_detected') }}
      </div>
    </v-card-text>

    <!-- Settings Dialog -->
    <cfs-dryer-settings-dialog v-model="settingsDialogOpen" />
  </collapsable-card>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import CfsDryerChamber from './CfsDryerChamber.vue'
import CfsDryerSettingsDialog from './CfsDryerSettingsDialog.vue'
import {
  DRYER_PRESETS,
  formatSetDryCommand,
  formatPauseDryCommand,
  formatContinueDryCommand,
  type BoxDryerTelemetry,
  type ChamberTelemetry,
  type MaterialPreset
} from './types'

@Component({
  components: {
    CfsDryerChamber,
    CfsDryerSettingsDialog
  }
})
export default class CfsDryerCard extends Mixins(StateMixin) {
  settingsDialogOpen = false

  boxAddr = 1
  selectedChannel = 3 // 3 = Both, 1 = Left, 2 = Right
  targetTemp = 50
  durationHours = 4

  readonly presets = DRYER_PRESETS

  get box () {
    return this.$typedState.printer.printer.box ?? null
  }

  get dryer (): BoxDryerTelemetry | null {
    return this.box?.dryer ?? null
  }

  get dryerSupported (): boolean {
    return this.dryer?.supported === true
  }

  get acConnected (): boolean {
    return this.dryer?.ac_connected === true
  }

  get ambientTemp (): number | null {
    return this.box?.temp_c ?? null
  }

  get ambientHumidity (): number | null {
    return this.box?.humidity_pct ?? null
  }

  get ch0 (): ChamberTelemetry {
    return this.dryer?.ch0 ?? {
      heating: false,
      target_temp: 0,
      remaining_time: 0,
      cur_temp: 0
    }
  }

  get ch1 (): ChamberTelemetry {
    return this.dryer?.ch1 ?? {
      heating: false,
      target_temp: 0,
      remaining_time: 0,
      cur_temp: 0
    }
  }

  get isHeating (): boolean {
    return Boolean(this.ch0.heating || this.ch1.heating)
  }

  get hasPausedChamber (): boolean {
    return !this.isHeating && ((this.ch0.remaining_time ?? 0) > 0 || (this.ch1.remaining_time ?? 0) > 0)
  }

  applyPreset (preset: MaterialPreset) {
    this.targetTemp = preset.temp
    this.durationHours = preset.durationMinutes / 60
  }

  startDrying () {
    const minutes = Math.round(this.durationHours * 60)
    this.sendGcode(formatSetDryCommand(this.boxAddr, this.selectedChannel, this.targetTemp, minutes))
  }

  pauseDrying () {
    this.sendGcode(formatPauseDryCommand(this.boxAddr, this.selectedChannel))
  }

  resumeDrying () {
    this.sendGcode(formatContinueDryCommand(this.boxAddr))
  }

  stopDrying () {
    // Pause both chambers
    this.sendGcode(formatPauseDryCommand(this.boxAddr, 3))
  }
}
</script>

<style lang="scss" scoped>
.cfs-dryer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ac-alert {
  padding: 6px 12px;
}

.dryer-status-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: rgba(255, 255, 255, 0.03) !important;

  .status-chip-label {
    color: var(--v-secondary-lighten1);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    margin-right: 4px;
  }

  .status-chip-value {
    font-weight: 700;
  }

  &.connected {
    color: #81c784;
    border-color: rgba(76, 175, 80, 0.35) !important;
  }

  &.disconnected {
    color: #e57373;
    border-color: rgba(244, 67, 54, 0.35) !important;
  }
}

.heating-chip {
  color: #ff9800;
  border-color: rgba(255, 152, 0, 0.4) !important;
  background: rgba(255, 152, 0, 0.08) !important;

  .heating-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff9800;
    box-shadow: 0 0 6px #ff9800;
    margin-right: 5px;
    animation: pulse-dot 1.5s infinite ease-in-out;
  }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.2); }
}

.dryer-chambers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.presets-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.presets-title {
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.presets-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--v-primary-base) !important;
    color: var(--v-primary-base);
  }
}

.dryer-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.control-label {
  min-width: 100px;
  white-space: nowrap;
}

.control-slider {
  flex: 1;
}

.channel-toggle {
  border-radius: 4px;
}

.control-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  justify-content: flex-end;
}

.action-btn {
  min-width: 80px;
}

.opacity-50 {
  opacity: 0.5;
}
</style>
