<template>
  <div class="filament-box-slots">
    <div
      class="slot-groups"
      :class="{ narrow, 'without-external': !hasExternal }"
    >
      <section
        v-for="group in groups"
        :key="`filament-box-group-${group.key}`"
        class="slot-group"
        :class="{ external: group.external }"
        data-test="filament-box-slot-group"
      >
        <div class="slots-header">
          <span>{{ group.label }}</span>
          <span>{{ group.range }}</span>
        </div>
        <div class="slots-grid">
          <filament-box-slot
            v-for="slot in group.slots"
            :key="`filament-box-slot-${slot.index}`"
            :slot-data="slot"
            :load-blocked="blockPhysicalLoads && !slot.external"
            @edit="$emit('edit', $event)"
            @load="$emit('load', $event)"
            @reset="$emit('reset', $event)"
          />
        </div>
      </section>
    </div>
    <div
      v-if="runout"
      class="runout-chain"
      data-test="filament-box-runout"
    >
      <span class="runout-label">{{ $t('app.filament_box.label.runout') }}</span>
      <span class="runout-node">T{{ runout.loaded_slot }}</span>
      <template v-if="runout.chain && runout.chain.length">
        <template v-for="(slotNum, idx) in runout.chain">
          <span
            :key="`filament-box-runout-arrow-${idx}-${slotNum}`"
            class="runout-arrow"
          >
            →
          </span>
          <span
            :key="`filament-box-runout-slot-${idx}-${slotNum}`"
            class="runout-node"
          >
            T{{ slotNum }}
          </span>
        </template>
      </template>
      <template v-else>
        <span class="runout-arrow">→</span>
        <span class="runout-none">{{ $t('app.filament_box.label.none') }}</span>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import type { SlotGroup } from './types'
import FilamentBoxSlot from './FilamentBoxSlot.vue'

@Component({
  components: {
    FilamentBoxSlot
  }
})
export default class FilamentBoxSlots extends Vue {
  @Prop({ type: Array, required: true })
  readonly groups!: SlotGroup[]

  @Prop({ default: null })
  readonly runout!: any

  @Prop({ type: Boolean, default: false })
  readonly narrow!: boolean

  @Prop({ type: Boolean, default: false })
  readonly blockPhysicalLoads!: boolean

  get hasExternal (): boolean {
    return this.groups.some(g => g.external)
  }
}
</script>

<style lang="scss" scoped>
.filament-box-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slot-groups {
  display: grid;
  grid-template-columns: minmax(112px, 0.85fr) minmax(0, 4fr);
  align-items: start;
  gap: 8px;

  &.without-external {
    grid-template-columns: minmax(0, 1fr);
  }

  &.narrow {
    grid-template-columns: minmax(96px, 0.72fr) minmax(0, 2fr);

    &.without-external {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}

.slot-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  &.external {
    position: relative;

    &:after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      right: -4px;
      width: 1px;
      background: rgba(255, 255, 255, 0.08);
      pointer-events: none;
    }
  }

  &:not(.external) {
    grid-column: 2;
  }
}

.without-external .slot-group:not(.external) {
  grid-column: 1;
}

.slots-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--v-secondary-lighten2);
  font-size: 0.7rem;
  line-height: 1.2;
  text-transform: uppercase;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.external .slots-grid {
  grid-template-columns: minmax(0, 1fr);
}

.narrow .slot-group:not(.external) .slots-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.runout-chain {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--v-secondary-lighten1);
  font-size: 0.74rem;
  font-weight: 700;
}

.runout-label {
  color: var(--v-secondary-lighten2);
  font-size: 0.62rem;
  text-transform: uppercase;
}

.runout-node,
.runout-none {
  flex: none;
}

.runout-arrow {
  color: var(--v-secondary-lighten2);
}
</style>
