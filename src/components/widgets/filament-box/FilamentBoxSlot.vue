<template>
  <article
    class="slot-card"
    :class="slotClasses"
    data-test="filament-box-slot"
  >
    <button
      v-if="slotData.interactive"
      type="button"
      class="slot-card-action"
      :aria-label="slotAriaLabel"
      data-test="filament-box-slot-edit"
      @click="$emit('edit', slotData.index)"
    />
    <div class="slot-top">
      <div class="slot-title-wrap">
        <span class="slot-cfs-tag font-weight-bold">{{ slotHeaderTitle }}</span>
        <span class="slot-tool-tag text-caption text--secondary font-weight-medium">T{{ slotData.index }}</span>
      </div>
      <span
        class="slot-token"
        :class="slotData.state"
      >
        {{ stateLabel }}
      </span>
    </div>
    <div class="slot-material-row">
      <span
        class="slot-color"
        :style="{ backgroundColor: slotData.color }"
      />
      <div class="slot-material-copy">
        <span class="slot-material font-weight-bold">{{ slotData.material }}</span>
        <span
          v-if="slotData.brand || slotData.name"
          class="slot-brand text-caption text--secondary"
        >
          {{ profileName }}
        </span>
      </div>
    </div>
    <div
      v-if="slotData.interactive"
      class="slot-footer"
    >
      <div
        class="slot-spool-usage"
        :class="{ empty: !slotData.usage }"
      >
        <span class="slot-spool-usage-label">{{ slotData.usage?.label || '--' }}</span>
        <div class="slot-spool-usage-bar">
          <span :style="{ width: `${slotData.usage?.percent ?? 0}%` }" />
        </div>
      </div>
      <v-btn
        v-if="canLoad"
        class="slot-action-btn load"
        x-small
        outlined
        color="primary"
        data-test="filament-box-slot-load"
        @click.stop="$emit('load', slotData.index)"
      >
        <v-icon
          left
          x-small
        >
          $mmuLoad
        </v-icon>
        {{ $t('app.filament_box.btn.load') }}
      </v-btn>
      <v-btn
        v-else-if="canReset"
        class="slot-action-btn reset"
        x-small
        outlined
        color="error"
        data-test="filament-box-slot-reset"
        :title="$t('app.filament_box.btn.reset_slot')"
        @click.stop="$emit('reset', slotData.index)"
      >
        <v-icon
          left
          x-small
        >
          $delete
        </v-icon>
        {{ $t('app.filament_box.btn.reset') }}
      </v-btn>
    </div>
  </article>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import type { FormattedSlot } from './types'

@Component({})
export default class FilamentBoxSlot extends Vue {
  @Prop({ type: Object, required: true })
  readonly slotData!: FormattedSlot

  @Prop({ type: Boolean, default: false })
  readonly loadBlocked!: boolean

  get slotHeaderTitle (): string {
    if (this.slotData.external) {
      return 'Ext'
    }
    return `CFS\u00A0${String.fromCharCode(65 + (this.slotData.index % 4))}`
  }

  get slotClasses () {
    return {
      loaded: this.slotData.loaded,
      present: this.slotData.external || this.slotData.present,
      external: this.slotData.external,
      unloaded: this.slotData.state === 'unloaded',
      disabled: !this.slotData.interactive
    }
  }

  get stateLabel (): string {
    return String(this.$t(`app.filament_box.state.${this.slotData.state}`))
  }

  get profileName (): string {
    return [this.slotData.brand, this.slotData.name].filter(Boolean).join(' · ')
  }

  get hasProfile (): boolean {
    return (
      (Boolean(this.slotData.material) && this.slotData.material !== '--') ||
      Boolean(this.slotData.brand) ||
      Boolean(this.slotData.name)
    )
  }

  get canLoad (): boolean {
    return (
      !this.slotData.loaded &&
      !this.loadBlocked &&
      this.slotData.state === 'ready' &&
      this.slotData.material !== '--' &&
      this.slotData.material !== ''
    )
  }

  get canReset (): boolean {
    return !this.slotData.loaded && this.hasProfile && this.slotData.state === 'unloaded'
  }

  get slotAriaLabel (): string {
    return String(this.$t('app.filament_box.label.slot_summary', {
      slot: `${this.slotHeaderTitle} (T${this.slotData.index})`,
      state: this.stateLabel,
      material: this.slotData.material
    }))
  }
}
</script>

<style lang="scss" scoped>
.slot-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 124px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover,
  &:focus-within {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &.loaded {
    background: rgba(255, 193, 7, 0.06);
    border-color: var(--v-warning-base, #ffc107);
    box-shadow: 0 0 12px rgba(255, 193, 7, 0.15), inset 0 0 0 1px var(--v-warning-base, #ffc107);
  }

  &.external:not(.loaded) {
    border-color: rgba(33, 150, 243, 0.25);
    background: rgba(33, 150, 243, 0.04);

    &:hover,
    &:focus-within {
      border-color: rgba(33, 150, 243, 0.45);
      background: rgba(33, 150, 243, 0.07);
    }
  }

  &.disabled:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.slot-card-action {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  background: 0 0;
  border: 0;
  border-radius: inherit;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--v-primary-base);
    outline-offset: 2px;
  }
}

.slot-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.slot-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

.slot-cfs-tag {
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
}

.slot-tool-tag {
  font-size: 0.7rem;
  white-space: nowrap;
}

.slot-token {
  flex-shrink: 0;
  padding: 2px 7px;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid;
  border-radius: 999px;
  overflow: hidden;

  &.loaded {
    color: #ffb74d;
    border-color: rgba(255, 183, 77, 0.45);
    background: rgba(255, 183, 77, 0.15);
  }

  &.ready {
    color: #81c784;
    border-color: rgba(129, 199, 132, 0.45);
    background: rgba(129, 199, 132, 0.12);
  }

  &.unloaded {
    color: #e57373;
    border-color: rgba(229, 115, 115, 0.4);
    background: rgba(229, 115, 115, 0.1);
  }

  &.unknown {
    color: var(--v-secondary-lighten2);
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
  }
}

.slot-material-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  margin-bottom: 8px;
}

.slot-color {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s ease;
}

.slot-card:hover .slot-color {
  transform: scale(1.08);
}

.slot-material-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slot-brand,
.slot-material {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.slot-material {
  font-size: 0.95rem;
  letter-spacing: -0.2px;
}

.slot-brand {
  font-size: 0.68rem;
  margin-top: 1px;
}

.slot-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  margin-top: auto;
}

.slot-spool-usage {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  width: 100%;
  min-width: 0;
  max-width: 110px;

  &.empty {
    visibility: hidden;
  }
}

.slot-spool-usage-label {
  color: var(--v-secondary-lighten1);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-spool-usage-bar {
  width: 82px;
  max-width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: var(--v-primary-base);
    border-radius: inherit;
    transition: width 0.25s ease;
  }
}

.slot-action-btn {
  z-index: 2;
  flex: none;
  height: 24px !important;

  &.load {
    min-width: 60px;
  }

  &.reset {
    min-width: 0;
    padding: 0 6px !important;
    font-size: 0.68rem;
  }
}
</style>
