<template>
  <div>
    <app-dialog
      v-model="open"
      :title="$t('app.filament_box.title.edit_slot', { slot: `T${normalizedSlotIndex}` })"
      :save-button-disabled="!canSave"
      max-width="640"
      @save="handleSave"
    >
      <v-card-text class="d-flex flex-column gap-4">
        <div class="material-row">
          <v-select
            v-model="material"
            :items="normalizedMaterialOptions"
            :label="$t('app.filament_box.label.material')"
            :rules="materialRules"
            item-text="key"
            item-value="key"
            outlined
            dense
            hide-details="auto"
            @change="handleMaterialChanged"
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
          <app-btn
            color="primary"
            outlined
            small
            @click="openMaterialDialog()"
          >
            {{ $t('app.filament_box.btn.new_material') }}
          </app-btn>
        </div>

        <div class="profile-row">
          <v-text-field
            v-model="name"
            :label="$t('app.filament_box.label.name')"
            outlined
            dense
            hide-details="auto"
          />
          <v-text-field
            v-model="brand"
            :label="$t('app.filament_box.label.brand')"
            outlined
            dense
            hide-details="auto"
          />
        </div>

        <div
          class="color-panel"
          role="group"
          :aria-label="$t('app.filament_box.label.color').toString()"
        >
          <span class="text-overline secondary--text">{{ $t('app.filament_box.label.color') }}</span>
          <div class="color-swatches">
            <button
              v-for="item in colorSwatches"
              :key="item.color"
              type="button"
              class="color-swatch"
              :class="{ selected: normalizedColor === item.color }"
              :style="{ backgroundColor: item.color }"
              :aria-label="$t(item.labelKey).toString()"
              :aria-pressed="normalizedColor === item.color"
              @click="color = item.color"
            />
          </div>
        </div>

        <div
          v-if="spoolmanEnabled"
          class="spoolman-panel"
        >
          <div>
            <div class="font-weight-bold">
              {{ $t('app.filament_box.label.spoolman') }}
            </div>
            <div class="text-caption secondary--text">
              <template v-if="selectedSpoolId == null">
                {{ $t('app.filament_box.label.no_spool_selected') }}
              </template>
              <template v-else>
                {{ selectedSpool?.filament_name || name || $t('app.filament_box.label.assigned_spool') }} · {{ $t('app.filament_box.label.spool_id', { id: selectedSpoolId }) }}
              </template>
            </div>
          </div>
          <div class="spoolman-actions">
            <app-btn
              color="primary"
              outlined
              small
              @click="openSpoolSelection"
            >
              {{ $t('app.filament_box.btn.select_spool') }}
            </app-btn>
            <app-btn
              v-if="selectedSpoolId != null"
              color="primary"
              text
              small
              @click="selectedSpoolId = null"
            >
              {{ $t('app.filament_box.btn.clear_spool') }}
            </app-btn>
          </div>
        </div>
      </v-card-text>
    </app-dialog>

    <filament-box-material-dialog
      v-model="materialDialogOpen"
      :initial-material="pendingMaterial"
      @save="handleMaterialSaved"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import FilamentBoxMaterialDialog from './FilamentBoxMaterialDialog.vue'
import {
  DEFAULT_PROFILE,
  COLOR_SWATCHES,
  normalizeMaterial,
  normalizeColor,
  type FilamentBoxProfile,
  type MaterialOption
} from './types'

@Component({
  components: {
    FilamentBoxMaterialDialog
  }
})
export default class FilamentBoxSlotDialog extends Mixins(StateMixin) {
  @VModel({ type: Boolean })
  open?: boolean

  @Prop({ type: Number, default: null })
  readonly slotIndex!: number | null

  @Prop({ type: Object, default: () => DEFAULT_PROFILE })
  readonly profile!: FilamentBoxProfile

  @Prop({ type: Number, default: null })
  readonly spoolId!: number | null

  @Prop({ type: Boolean, default: false })
  readonly spoolmanEnabled!: boolean

  @Prop({ type: Array, default: () => [] })
  readonly materialOptions!: MaterialOption[]

  material = ''
  targetTemp: number | null = null
  color = DEFAULT_PROFILE.color
  brand = ''
  name = ''
  selectedSpoolId: number | null = null
  localMaterialOptions: MaterialOption[] = []
  materialDialogOpen = false
  pendingMaterial = ''
  pendingSpoolId: number | null = null
  spoolSelectionOwned = false
  colorSwatches = COLOR_SWATCHES

  materialRules = [
    (val: string) => !!val || this.$t('app.filament_box.validation.required'),
    (val: string) => this.isKnownMaterial(val) || this.$t('app.filament_box.validation.known_material')
  ]

  temperatureRules = [
    (val: any) => this.isValidTemperature(val) || this.$t('app.filament_box.validation.temperature_range')
  ]

  get normalizedSlotIndex (): number {
    return this.slotIndex ?? 0
  }

  get normalizedColor (): string {
    return normalizeColor(this.color)
  }

  get selectedSpool (): any {
    return this.selectedSpoolId == null ? undefined : this.$typedGetters['spoolman/getSpoolById'](this.selectedSpoolId)
  }

  get normalizedMaterialOptions (): MaterialOption[] {
    const map = new Map<string, MaterialOption>()
    for (const item of [...this.materialOptions, ...this.localMaterialOptions]) {
      const key = normalizeMaterial(item.key)
      if (key) {
        map.set(key, { key, targetTemp: item.targetTemp })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }

  get canSave (): boolean {
    return this.isKnownMaterial(this.material) && this.isValidTemperature(this.targetTemp)
  }

  @Watch('open')
  onOpenChanged (val: boolean) {
    if (val) {
      this.resetForm()
    } else {
      this.materialDialogOpen = false
    }
  }

  @Watch('profile')
  onProfileChanged () {
    if (this.open) {
      this.resetForm()
    }
  }

  @Watch('spoolId')
  onSpoolIdChanged () {
    if (this.open) {
      this.selectedSpoolId = this.spoolId
    }
  }

  @Watch('materialOptions')
  onMaterialOptionsChanged () {
    const existing = new Set(this.materialOptions.map(m => normalizeMaterial(m.key)))
    this.localMaterialOptions = this.localMaterialOptions.filter(m => !existing.has(normalizeMaterial(m.key)))
  }

  @Watch('materialDialogOpen')
  onMaterialDialogChanged (val: boolean) {
    if (!val && this.pendingSpoolId != null) {
      if (this.selectedSpoolId === this.pendingSpoolId) {
        this.selectedSpoolId = null
      }
      this.pendingSpoolId = null
      this.pendingMaterial = ''
    }
  }

  @Watch('$typedState.spoolman.dialog')
  onSpoolmanDialogChanged (dialog: any) {
    if (dialog.show || !this.spoolSelectionOwned) return
    this.spoolSelectionOwned = false
    const spoolId = dialog.selectedSpoolId ?? null
    if (spoolId === this.selectedSpoolId) return
    this.selectedSpoolId = spoolId
    const spool = spoolId != null ? this.$typedGetters['spoolman/getSpoolById'](spoolId) : undefined
    if (spool) {
      this.applySpool(spool)
    }
  }

  resetForm () {
    this.material = normalizeMaterial(this.profile.material)
    this.targetTemp = this.findMaterial(this.material)?.targetTemp ?? null
    this.color = normalizeColor(this.profile.color)
    this.brand = this.profile.brand
    this.name = this.profile.name
    this.selectedSpoolId = this.spoolId
    this.pendingMaterial = ''
    this.pendingSpoolId = null
    this.materialDialogOpen = false
  }

  findMaterial (mat?: string | null): MaterialOption | undefined {
    const key = normalizeMaterial(mat ?? '')
    return this.normalizedMaterialOptions.find(m => m.key === key)
  }

  isKnownMaterial (mat: string): boolean {
    return this.findMaterial(mat) != null
  }

  isValidTemperature (val: any): boolean {
    const num = Number(val)
    return Number.isFinite(num) && num >= 170 && num <= 350
  }

  handleMaterialChanged (val?: string | null) {
    this.material = normalizeMaterial(val ?? '')
    const item = this.findMaterial(this.material)
    if (item) {
      this.targetTemp = item.targetTemp
    }
  }

  openMaterialDialog (material = '', spoolId: number | null = null) {
    this.pendingMaterial = normalizeMaterial(material)
    this.pendingSpoolId = spoolId
    this.materialDialogOpen = true
  }

  handleMaterialSaved (item: MaterialOption) {
    const key = normalizeMaterial(item.key)
    this.localMaterialOptions = [
      ...this.localMaterialOptions.filter(m => normalizeMaterial(m.key) !== key),
      { key, targetTemp: item.targetTemp }
    ]
    this.material = key
    this.targetTemp = item.targetTemp
    this.pendingSpoolId = null
    this.pendingMaterial = ''
  }

  openSpoolSelection () {
    this.spoolSelectionOwned = true
    this.$typedCommit('spoolman/setDialogState', {
      show: true,
      spoolSelectionOnly: true,
      selectedSpoolId: this.selectedSpoolId ?? undefined
    })
  }

  applySpool (spool: any) {
    const mat = normalizeMaterial(spool.filament?.material ?? '')
    if (spool.filament?.color_hex) {
      this.color = normalizeColor(spool.filament.color_hex)
    }
    if (spool.filament?.vendor?.name) {
      this.brand = spool.filament.vendor.name
    }
    if (spool.filament?.name) {
      this.name = spool.filament.name
    }
    const found = this.findMaterial(mat)
    if (found) {
      this.material = found.key
      this.targetTemp = found.targetTemp
    } else if (mat) {
      this.openMaterialDialog(mat, spool.id)
    }
  }

  handleSave () {
    if (!this.canSave) return
    const payload = {
      material: normalizeMaterial(this.material),
      color: this.normalizedColor,
      brand: this.brand.trim(),
      name: this.name.trim(),
      spoolmanId: this.spoolmanEnabled ? this.selectedSpoolId : this.spoolId,
      targetTemp: this.targetTemp == null ? null : Math.round(Number(this.targetTemp))
    }
    this.$emit('save', payload)
    this.open = false
  }
}
</script>

<style lang="scss" scoped>
.gap-4 {
  gap: 16px;
}

.material-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px auto;
  align-items: start;
  gap: 10px;

  .app-btn {
    margin-top: 2px;
  }
}

.profile-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.color-panel,
.spoolman-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #8080803d;
  border-radius: 8px;
}

.color-swatches,
.spoolman-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-swatches {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 2px solid #80808059;
  cursor: pointer;
  outline: none;

  &.selected,
  &:focus-visible {
    border-color: var(--v-primary-base);
    box-shadow: 0 0 0 2px #1976d240;
  }
}

@media (max-width: 600px) {
  .material-row,
  .profile-row {
    grid-template-columns: 1fr;
  }

  .color-panel,
  .spoolman-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .color-swatches {
    justify-content: flex-start;
  }
}
</style>
