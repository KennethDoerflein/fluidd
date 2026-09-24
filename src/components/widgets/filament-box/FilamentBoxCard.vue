<template>
  <collapsable-card
    :title="$t('app.filament_box.title.filament_box')"
    icon="$filament"
    draggable
    layout-path="dashboard.filament-box-card"
  >
    <template #menu>
      <app-btn
        icon
        :disabled="box == null"
        @click="settingsDialogOpen = true"
      >
        <v-icon dense>
          $cog
        </v-icon>
      </app-btn>
    </template>

    <v-card-text class="filament-box-body">
      <template v-if="box">
        <filament-box-status
          :box="box"
          :printhead-detected="printheadDetected"
          :can-unload="canUnload"
          @unload="unload"
        />
        <filament-box-slots
          :groups="slotGroups"
          :runout="runout"
          :narrow="narrow"
          :block-physical-loads="externalSlotLoaded"
          @edit="openSlot"
          @load="loadSlot"
          @reset="resetSlot"
        />
      </template>
      <div
        v-else
        class="py-4 text-center secondary--text"
      >
        {{ $t('app.filament_box.state.connecting') }}
      </div>
    </v-card-text>

    <filament-box-slot-dialog
      v-model="slotDialogOpen"
      :slot-index="selectedSlotIndex"
      :profile="selectedSlotProfile"
      :spool-id="selectedSlotSpoolId"
      :spoolman-enabled="spoolmanEnabled"
      :material-options="materialOptions"
      @save="saveSlot"
      @reset="resetSlot"
    />

    <filament-box-settings-dialog
      v-model="settingsDialogOpen"
      @reset-all="resetAllSlots"
    />
  </collapsable-card>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import FilamentBoxSettingsDialog from './FilamentBoxSettingsDialog.vue'
import FilamentBoxSlotDialog from './FilamentBoxSlotDialog.vue'
import FilamentBoxSlots from './FilamentBoxSlots.vue'
import FilamentBoxStatus from './FilamentBoxStatus.vue'
import {
  DEFAULT_PROFILE,
  formatSlot,
  groupSlots,
  formatMaterials,
  formatMaterialCommand,
  formatSlotCommand,
  formatSlotClearCommand,
  type FilamentBoxProfile,
  type FormattedSlot,
  type SlotGroup,
  type MaterialOption
} from './types'

@Component({
  components: {
    FilamentBoxSettingsDialog,
    FilamentBoxSlotDialog,
    FilamentBoxSlots,
    FilamentBoxStatus
  }
})
export default class FilamentBoxCard extends Mixins(StateMixin) {
  @Prop({ type: Boolean, default: false })
  readonly narrow!: boolean

  settingsDialogOpen = false
  slotDialogOpen = false
  selectedSlotIndex: number | null = null

  get box () {
    return this.$typedState.printer.printer.box ?? null
  }

  get spoolmanEnabled (): boolean {
    return this.$typedGetters['server/componentSupport']('spoolman')
  }

  get printheadDetected (): boolean | null {
    return (
      this.$typedState.printer.printer['filament_switch_sensor filament_sensor']?.filament_detected ??
      this.box?.filament_detected ??
      this.box?.load_path?.printhead_sensor?.detected ??
      null
    )
  }

  get canUnload (): boolean {
    return (
      this.box?.data_ready === true &&
      ((this.box.loaded_slot != null && this.box.loaded_slot >= 0) || this.printheadDetected === true)
    )
  }

  get externalSlotLoaded (): boolean {
    const box = this.box
    if (!box?.data_ready || box.loaded_slot == null) return false
    return (box.slots ?? []).some((s: any) => s.external && s.index === box.loaded_slot)
  }

  get slots (): FormattedSlot[] {
    const box = this.box
    if (box == null || !box.slots) return []
    return box.slots.map((s: any) => {
      const spool = s.spoolman_id == null ? undefined : this.getSpool(s.spoolman_id)
      return formatSlot(s, box.data_ready, spool)
    })
  }

  get slotGroups (): SlotGroup[] {
    let boxNum = 0
    return groupSlots(this.slots).map(group => {
      if (group.external) {
        return { ...group, label: 'External Spool' }
      }
      boxNum += 1
      return { ...group, label: `CFS ${boxNum}` }
    })
  }

  get runout (): any {
    const box = this.box
    if (!box?.data_ready || !box.runout_swap_enabled || box.runout == null) return null
    return box.runout.loaded_slot >= 0 ? box.runout : null
  }

  get materialOptions (): MaterialOption[] {
    return this.box == null ? [] : formatMaterials(this.box.materials)
  }

  get selectedSlot (): any {
    if (this.selectedSlotIndex == null) return null
    return this.box?.slots?.find((s: any) => s.index === this.selectedSlotIndex) ?? null
  }

  get selectedSlotProfile (): FilamentBoxProfile {
    const s = this.selectedSlot
    return s == null
      ? { ...DEFAULT_PROFILE }
      : { material: s.material, color: s.color, brand: s.brand ?? '', name: s.name ?? '' }
  }

  get selectedSlotSpoolId (): number | null {
    return this.selectedSlot?.spoolman_id ?? null
  }

  getSpool (id: number): any {
    return this.spoolmanEnabled ? this.$typedGetters['spoolman/getSpoolById'](id) : undefined
  }

  openSlot (index: number) {
    const slot = this.slots.find(s => s.index === index)
    if (slot?.interactive) {
      this.selectedSlotIndex = index
      this.slotDialogOpen = true
    }
  }

  loadSlot (index: number) {
    const slot = this.slots.find(s => s.index === index)
    if (!slot?.interactive || slot.loaded || (this.externalSlotLoaded && !slot.external)) return
    this.sendGcode(`T${index}`)
  }

  unload () {
    if (this.canUnload) {
      this.sendGcode('BOX_UNLOAD')
    }
  }

  saveSlot (profile: any) {
    if (this.selectedSlotIndex == null) return
    const isKnown = this.materialOptions.some(m => m.key === profile.material)
    const gcodes: string[] = []
    if (profile.targetTemp != null && !isKnown) {
      gcodes.push(formatMaterialCommand(profile.material, profile.targetTemp))
    }
    gcodes.push(formatSlotCommand(this.selectedSlotIndex, profile, {
      spoolmanSupported: this.spoolmanEnabled,
      spoolmanId: profile.spoolmanId
    }))
    this.sendGcode(gcodes.join('\n'))
    this.slotDialogOpen = false
  }

  resetSlot (index: number) {
    this.sendGcode(formatSlotClearCommand(index))
  }

  resetAllSlots () {
    if (this.slots.length > 0) {
      this.sendGcode(this.slots.map(s => formatSlotClearCommand(s.index)).join('\n'))
    } else {
      this.sendGcode(formatSlotClearCommand('ALL'))
    }
  }
}
</script>

<style lang="scss" scoped>
.filament-box-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
