<template>
  <app-dialog
    v-model="open"
    :title="$t('app.filament_box.title.new_filament')"
    :save-button-text="$t('app.filament_box.btn.add')"
    :save-button-disabled="!canSave"
    max-width="420"
    @cancel="handleCancel"
    @save="handleSave"
  >
    <v-card-text class="d-flex flex-column gap-4">
      <p
        v-if="initialMaterial"
        class="ma-0 secondary--text"
      >
        {{ $t('app.filament_box.msg.unknown_material', { material: normalizedInitialMaterial }) }}
      </p>
      <v-text-field
        v-model="material"
        :label="$t('app.filament_box.label.material')"
        :rules="materialRules"
        outlined
        dense
        hide-details="auto"
      />
      <v-text-field
        v-model.number="targetTemp"
        :label="$t('app.filament_box.label.flush_temperature')"
        :rules="temperatureRules"
        suffix="°C"
        type="number"
        min="170"
        max="350"
        step="1"
        outlined
        dense
        hide-details="auto"
      />
    </v-card-text>
  </app-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import { normalizeMaterial, formatMaterialCommand } from './types'

@Component({})
export default class FilamentBoxMaterialDialog extends Mixins(StateMixin) {
  @VModel({ type: Boolean })
  open?: boolean

  @Prop({ type: String, default: '' })
  readonly initialMaterial!: string

  materialValue = ''
  targetTemp: number | null = null

  materialRules = [
    (val: string) => !!normalizeMaterial(val) || this.$t('app.filament_box.validation.required')
  ]

  temperatureRules = [
    (val: any) => this.isValidTemperature(val) || this.$t('app.filament_box.validation.temperature_range')
  ]

  get material (): string {
    return this.materialValue
  }

  set material (val: string) {
    this.materialValue = normalizeMaterial(val)
  }

  get normalizedInitialMaterial (): string {
    return normalizeMaterial(this.initialMaterial)
  }

  get canSave (): boolean {
    return this.material.length > 0 && this.isValidTemperature(this.targetTemp)
  }

  @Watch('open')
  onOpenChanged (val: boolean) {
    if (val) this.reset()
  }

  @Watch('initialMaterial')
  onInitialMaterialChanged () {
    if (this.open) this.reset()
  }

  reset () {
    this.material = this.initialMaterial
    this.targetTemp = null
  }

  isValidTemperature (val: any): boolean {
    const num = Number(val)
    return Number.isFinite(num) && num >= 170 && num <= 350
  }

  handleCancel () {
    this.open = false
    this.$emit('cancel')
  }

  handleSave () {
    if (!this.canSave) return
    const temp = Math.round(Number(this.targetTemp))
    const item = { key: this.material, targetTemp: temp }
    this.sendGcode(formatMaterialCommand(item.key, temp))
    this.$emit('save', item)
    this.open = false
  }
}
</script>

<style lang="scss" scoped>
.gap-4 {
  gap: 16px;
}
</style>
