<template>
  <app-dialog
    v-model="open"
    :title="$t('app.filament_box.title.settings')"
    max-width="480"
    no-actions
  >
    <v-card-text class="pa-0">
      <app-setting
        :title="$t('app.filament_box.label.runout_swap')"
        :sub-title="$t('app.filament_box.label.runout_swap_description')"
      >
        <v-switch
          class="mt-0"
          :input-value="runoutSwapEnabled"
          :disabled="runoutSwapEnabled == null"
          hide-details
          @change="setRunoutSwap"
        />
      </app-setting>
      <app-setting
        :title="$t('app.filament_box.label.unload_after_print')"
        :sub-title="$t('app.filament_box.label.unload_after_print_description')"
      >
        <v-switch
          class="mt-0"
          :input-value="unloadAfterPrintEnabled"
          :disabled="unloadAfterPrintEnabled == null"
          hide-details
          @change="setUnloadAfterPrint"
        />
      </app-setting>
      <app-setting
        :title="$t('app.filament_box.label.rfid_insert_reading')"
        :sub-title="$t('app.filament_box.label.rfid_insert_reading_description')"
      >
        <v-switch
          class="mt-0"
          :input-value="rfidInsertReadingEnabled"
          :disabled="rfidInsertReadingEnabled == null"
          hide-details
          @change="setRfidInsertReading"
        />
      </app-setting>
      <app-setting :title="$t('app.filament_box.label.rfid_startup_reading')">
        <template #sub-title>
          <i18n
            path="app.filament_box.label.rfid_startup_reading_description"
            tag="span"
          >
            <template #only>
              <strong>only</strong>
            </template>
          </i18n>
        </template>
        <v-switch
          class="mt-0"
          :input-value="rfidStartupReadingEnabled"
          :disabled="rfidStartupReadingEnabled == null"
          hide-details
          @change="setRfidStartupReading"
        />
      </app-setting>
    </v-card-text>
  </app-dialog>
</template>

<script lang="ts">
import { Component, Mixins, VModel } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'

@Component({})
export default class FilamentBoxSettingsDialog extends Mixins(StateMixin) {
  @VModel({ type: Boolean })
  open?: boolean

  get boxState () {
    return this.$typedState.printer.printer.box ?? null
  }

  get runoutSwapEnabled (): boolean | null {
    return this.boxState?.runout_swap_enabled ?? null
  }

  get rfidInsertReadingEnabled (): boolean | null {
    return this.boxState?.rfid_insert_reading_enabled ?? null
  }

  get unloadAfterPrintEnabled (): boolean | null {
    return this.boxState?.unload_after_print_enabled ?? null
  }

  get rfidStartupReadingEnabled (): boolean | null {
    return this.boxState?.rfid_startup_reading_enabled ?? null
  }

  setRunoutSwap (val: boolean) {
    this.sendGcode(`_BOX_SET_RUNOUT_SWAP ENABLE=${+val}`)
  }

  setUnloadAfterPrint (val: boolean) {
    this.sendGcode(`_BOX_SET_UNLOAD_AFTER_PRINT ENABLE=${+val}`)
  }

  setRfidInsertReading (val: boolean) {
    this.sendGcode(`_BOX_SET_RFID_INSERT_READING ENABLE=${+val}`)
  }

  setRfidStartupReading (val: boolean) {
    this.sendGcode(`_BOX_SET_RFID_STARTUP_READING ENABLE=${+val}`)
  }
}
</script>
