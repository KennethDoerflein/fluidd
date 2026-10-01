<template>
  <app-dialog
    v-model="open"
    :title="$t('app.cfs_dryer.title.settings')"
    max-width="500"
    no-actions
  >
    <v-card-text class="pa-0">
      <app-setting
        :title="$t('app.cfs_dryer.label.auto_dry')"
        :sub-title="$t('app.cfs_dryer.label.auto_dry_description')"
      >
        <v-switch
          class="mt-0"
          :input-value="autoDryEnabled"
          :disabled="autoDryEnabled == null"
          hide-details
          @change="setAutoDry"
        />
      </app-setting>

      <app-setting
        :title="$t('app.cfs_dryer.label.auto_humidity')"
        :sub-title="$t('app.cfs_dryer.label.auto_humidity_description')"
      >
        <v-switch
          class="mt-0"
          :input-value="autoHumidityEnabled"
          :disabled="autoHumidityEnabled == null"
          hide-details
          @change="setAutoHumidity"
        />
      </app-setting>

      <app-setting
        v-if="autoHumidityEnabled"
        :title="$t('app.cfs_dryer.label.humidity_threshold')"
        :sub-title="$t('app.cfs_dryer.label.humidity_threshold_description')"
      >
        <div class="d-flex align-center" style="max-width: 140px;">
          <v-slider
            v-model="localThreshold"
            :min="10"
            :max="60"
            :step="5"
            hide-details
            class="mr-2"
            @change="saveThreshold"
          />
          <span class="text-caption font-weight-bold">{{ localThreshold }}%</span>
        </div>
      </app-setting>
    </v-card-text>
  </app-dialog>
</template>

<script lang="ts">
import { Component, Mixins, VModel, Watch } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import { formatAutoDryCommand, formatAutoHumidityCommand } from './types'

@Component({})
export default class CfsDryerSettingsDialog extends Mixins(StateMixin) {
  @VModel({ type: Boolean })
  open?: boolean

  localThreshold = 25

  get boxState () {
    return this.$typedState.printer.printer.box ?? null
  }

  get dryerState () {
    return this.boxState?.dryer ?? null
  }

  get autoDryEnabled (): boolean | null {
    return this.dryerState?.auto_dry_enabled ?? null
  }

  get autoHumidityEnabled (): boolean | null {
    return this.dryerState?.auto_humidity_enabled ?? null
  }

  get autoHumidityThreshold (): number {
    return this.dryerState?.auto_humidity_threshold ?? 25
  }

  @Watch('autoHumidityThreshold', { immediate: true })
  onThresholdChanged (val: number) {
    if (val) this.localThreshold = val
  }

  setAutoDry (val: boolean) {
    this.sendGcode(formatAutoDryCommand(val))
  }

  setAutoHumidity (val: boolean) {
    this.sendGcode(formatAutoHumidityCommand(val, this.localThreshold))
  }

  saveThreshold (val: number) {
    if (this.autoHumidityEnabled) {
      this.sendGcode(formatAutoHumidityCommand(true, val))
    }
  }
}
</script>
