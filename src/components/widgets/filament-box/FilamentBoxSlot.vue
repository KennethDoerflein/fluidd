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
      <span class="slot-id">T{{ slotData.index }}</span>
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
      <span class="slot-material-copy">
        <span
          v-if="slotData.brand || slotData.name"
          class="slot-brand"
        >
          {{ profileName }}
        </span>
        <span class="slot-material">{{ slotData.material }}</span>
      </span>
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
        v-if="!slotData.loaded && !loadBlocked"
        class="slot-load-btn"
        x-small
        outlined
        data-test="filament-box-slot-load"
        @click.stop="$emit('load', slotData.index)"
      >
        {{ $t('app.filament_box.btn.load') }}
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

  get slotAriaLabel (): string {
    return String(this.$t('app.filament_box.label.slot_summary', {
      slot: `T${this.slotData.index}`,
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
  min-height: 118px;
  padding: 10px;
  background: #80808012;
  border: 1px solid #8080803d;
  border-radius: 8px;
  transition: background-color 0.16s, border-color 0.16s;

  &:hover,
  &:focus-within {
    background: #8080801f;
    border-color: #8080807a;
  }

  &.loaded {
    border-color: var(--v-warning-base);
    box-shadow: inset 0 0 0 1px var(--v-warning-base);
  }

  &.disabled:hover {
    background: #80808012;
    border-color: #8080803d;
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
  align-items: flex-start;
  gap: 8px;
}

.slot-id {
  font-size: 0.78rem;
  font-weight: 700;
}

.slot-token {
  max-width: 84px;
  padding: 2px 6px;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid;
  border-radius: 999px;
  overflow: hidden;

  &.loaded {
    color: var(--v-warning-base);
    background: #ffc1071f;
  }

  &.ready {
    color: var(--v-success-base);
    background: #4caf501a;
  }

  &.unloaded {
    color: var(--v-error-base);
    background: #f4433614;
  }

  &.unknown {
    color: var(--v-secondary-lighten2);
    background: #80808014;
  }
}

.slot-material-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
}

.slot-color {
  flex: none;
  width: 22px;
  height: 22px;
  border: 1px solid #ffffff61;
  border-radius: 50%;
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

.slot-brand {
  color: var(--v-secondary-lighten1);
  font-size: 0.66rem;
  font-weight: 600;
}

.slot-material {
  font-size: 1rem;
  font-weight: 700;
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
  max-width: 106px;

  &.empty {
    visibility: hidden;
  }
}

.slot-spool-usage-label {
  color: var(--v-secondary-lighten1);
  font-size: 0.6rem;
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
  background: #ffffff52;
  border-radius: 999px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: var(--v-primary-base);
    border-radius: inherit;
  }
}

.slot-load-btn {
  z-index: 2;
  flex: none;
  min-width: 54px;
  height: 24px !important;
}
</style>
