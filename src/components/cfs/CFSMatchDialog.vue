<template>
  <v-dialog
    :value="value"
    max-width="700"
    persistent
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title>
        CFS Filament Mapping
      </v-card-title>

      <v-card-subtitle>
        Map slicer tools to physical CFS slots before printing.
      </v-card-subtitle>

      <v-card-text v-if="loading">
        <v-progress-circular
          indeterminate
          color="primary"
        />
        Loading metadata...
      </v-card-text>

      <v-card-text v-else>
        <v-alert
          v-if="materialMismatches.length > 0"
          type="error"
          dense
          class="mb-4"
        >
          Material mismatch detected! Printing with mismatched materials
          can cause hotend jams or dangerous temperature errors.
          <ul>
            <li
              v-for="(m, i) in materialMismatches"
              :key="i"
            >
              Tool {{ m.tool }}: slicer={{ m.slicerMaterial }}, slot={{ m.slotMaterial }}
            </li>
          </ul>
        </v-alert>

        <v-alert
          type="info"
          dense
          class="mb-4"
        >
          Drastically changing colors post-slicing may result in incorrect
          flush volumes and color bleeding.
        </v-alert>

        <v-simple-table>
          <template #default>
            <thead>
              <tr>
                <th>Slicer Tool</th>
                <th>Physical Slot</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(tool, index) in slicerTools"
                :key="index"
              >
                <td>
                  <span
                    class="color-swatch"
                    :style="{ backgroundColor: tool.color }"
                  />
                  T{{ index }} — {{ tool.material || 'Unknown' }}
                </td>
                <td>
                  <v-select
                    v-model="toolMapping[index]"
                    :items="physicalSlotItems"
                    item-text="label"
                    item-value="slot"
                    dense
                    outlined
                    hide-details
                  >
                    <template #selection="{ item }">
                      <span
                        class="color-swatch"
                        :style="{ backgroundColor: item.color }"
                      />
                      {{ item.label }}
                    </template>
                    <template #item="{ item }">
                      <span
                        class="color-swatch"
                        :style="{ backgroundColor: item.color }"
                      />
                      {{ item.label }}
                    </template>
                  </v-select>
                </td>
              </tr>
            </tbody>
          </template>
        </v-simple-table>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="materialMismatches.length > 0 || loading"
          @click="confirmAndPrint"
        >
          Confirm &amp; Print
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { SocketActions } from '@/api/socketActions'

interface SlicerTool {
  color: string
  material: string
}

interface PhysicalSlot {
  slot: number
  label: string
  color: string
  material: string
}

@Component({})
export default class CFSMatchDialog extends Vue {
  @Prop({ type: Boolean, required: true })
  readonly value!: boolean

  @Prop({ type: String, required: true })
  readonly filename!: string

  loading = true
  slicerTools: SlicerTool[] = []
  physicalSlots: PhysicalSlot[] = []
  toolMapping: number[] = []

  get physicalSlotItems (): PhysicalSlot[] {
    return this.physicalSlots
  }

  get materialMismatches (): Array<{ tool: number; slicerMaterial: string; slotMaterial: string }> {
    const mismatches: Array<{ tool: number; slicerMaterial: string; slotMaterial: string }> = []
    for (let i = 0; i < this.slicerTools.length; i++) {
      const slicerMat = this.slicerTools[i].material
      const mappedSlotIndex = this.toolMapping[i]
      const physSlot = this.physicalSlots.find(s => s.slot === mappedSlotIndex)
      if (
        physSlot &&
        slicerMat &&
        physSlot.material &&
        slicerMat.toLowerCase() !== 'unknown' &&
        physSlot.material.toLowerCase() !== 'unknown' &&
        slicerMat.toLowerCase() !== physSlot.material.toLowerCase()
      ) {
        mismatches.push({
          tool: i,
          slicerMaterial: slicerMat,
          slotMaterial: physSlot.material
        })
      }
    }
    return mismatches
  }

  @Watch('value')
  async onOpen (val: boolean) {
    if (val) {
      await this.loadData()
    }
  }

  async mounted () {
    if (this.value) {
      await this.loadData()
    }
  }

  async loadData () {
    this.loading = true
    try {
      await this.fetchMetadata()
      await this.fetchLaneData()
      this.calculateDefaults()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[CFSMatchDialog] Failed to load data:', e)
    } finally {
      this.loading = false
    }
  }

  async fetchMetadata () {
    const response = await fetch(
      `/server/files/metadata?filename=${encodeURIComponent(this.filename)}`
    )
    const json = await response.json() as any
    const metaData = json.result || json

    let colors: string[] = metaData.filament_colors || metaData.filament_colour || []
    let types: string[] = metaData.filament_type || []

    // Crucial fallback for single-color prints
    if (colors.length === 0) {
      colors = ['#FFFFFF']
    }
    if (types.length === 0) {
      types = ['Unknown']
    }

    // Normalize lengths
    while (types.length < colors.length) {
      types.push('Unknown')
    }
    while (colors.length < types.length) {
      colors.push('#FFFFFF')
    }

    this.slicerTools = colors.map((c: string, i: number) => ({
      color: c.startsWith('#') ? c : `#${c}`,
      material: types[i] || 'Unknown'
    }))
  }

  async fetchLaneData () {
    this.physicalSlots = []

    // Fetch CFS lane data from Moonraker database
    try {
      const laneResp = await fetch('/server/database/item?namespace=lane_data')
      const laneJson = await laneResp.json() as any
      const laneData = laneJson.result?.value || laneJson.result || {}

      for (const [key, lane] of Object.entries(laneData)) {
        const l = lane as any
        if (l.tool !== undefined && l.tool !== null) {
          this.physicalSlots.push({
            slot: Number(l.tool),
            label: `Slot ${l.tool} — ${l.material || 'Unknown'}`,
            color: l.color_hex ? (l.color_hex.startsWith('#') ? l.color_hex : `#${l.color_hex}`) : '#808080',
            material: l.material || 'Unknown'
          })
        }
      }
    } catch {
      // Lane data might not exist
    }

    // Fetch external spool from printer objects
    try {
      const boxResp = await fetch('/printer/objects/query?box')
      const boxJson = await boxResp.json() as any
      const boxStatus = boxJson.result?.status?.box
      if (boxStatus?.external_spool !== undefined && boxStatus?.external_spool !== null) {
        const extSlot = boxStatus.external_spool
        this.physicalSlots.push({
          slot: typeof extSlot === 'number' ? extSlot : 4,
          label: `External Spool`,
          color: '#808080',
          material: 'Unknown'
        })
      }
    } catch {
      // External spool might not exist
    }

    // Sort by slot number
    this.physicalSlots.sort((a, b) => a.slot - b.slot)
  }

  hexToRgb (hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    return [
      parseInt(h.substring(0, 2), 16) || 0,
      parseInt(h.substring(2, 4), 16) || 0,
      parseInt(h.substring(4, 6), 16) || 0
    ]
  }

  colorDistance (c1: [number, number, number], c2: [number, number, number]): number {
    return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2)
  }

  calculateDefaults () {
    const mapping: number[] = []
    const usedSlots = new Set<number>()

    for (let i = 0; i < this.slicerTools.length; i++) {
      const toolRgb = this.hexToRgb(this.slicerTools[i].color)
      let bestSlot = this.physicalSlots.length > 0 ? this.physicalSlots[0].slot : i
      let bestDist = Infinity

      for (const ps of this.physicalSlots) {
        if (usedSlots.has(ps.slot)) continue
        const dist = this.colorDistance(toolRgb, this.hexToRgb(ps.color))
        if (dist < bestDist) {
          bestDist = dist
          bestSlot = ps.slot
        }
      }

      mapping.push(bestSlot)
      usedSlots.add(bestSlot)
    }

    this.toolMapping = mapping
  }

  cancel () {
    this.$emit('input', false)
  }

  async confirmAndPrint () {
    // Build routing command
    const parts: string[] = []
    for (let i = 0; i < this.toolMapping.length; i++) {
      parts.push(`T${i}=${this.toolMapping[i]}`)
    }
    const routingCmd = `BOX_SET_ROUTING ${parts.join(' ')}`

    try {
      // Send routing command to Klipper
      await SocketActions.printerGcodeScript(routingCmd)
      // Start the print
      await SocketActions.printerPrintStart(this.filename)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[CFSMatchDialog] Failed to start print:', e)
    }

    this.$emit('input', false)

    // Navigate to dashboard if not already there
    if (this.$route?.name !== 'home') {
      this.$router.push({ name: 'home' })
    }
  }
}
</script>

<style lang="scss" scoped>
.color-swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  vertical-align: middle;
  margin-right: 6px;
}
</style>
