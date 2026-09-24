<template>
  <v-dialog
    :value="value"
    max-width="560"
    persistent
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card class="cfs-card">
      <!-- ── Header ───────────────────────────────── -->
      <div class="cfs-header d-flex align-center px-5 py-3">
        <span class="text-h6 font-weight-bold">Map Filaments</span>
        <v-spacer />
        <v-btn
          icon
          small
          @click="cancel"
        >
          <v-icon>$close</v-icon>
        </v-btn>
      </div>

      <v-divider />

      <!-- ── Scrollable body ──────────────────────── -->
      <v-card-text class="cfs-body px-5 pt-4 pb-2">
        <!-- Loading -->
        <div
          v-if="loading"
          class="d-flex align-center justify-center py-10"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <span class="ml-4 text-body-2">Loading metadata…</span>
        </div>

        <template v-else>
          <!-- ── Thumbnail ──────────────────────── -->
          <div
            v-if="thumbnailUrl"
            class="cfs-thumb-wrap mb-4"
          >
            <v-img
              :src="thumbnailUrl"
              contain
              max-height="160"
              class="cfs-thumb-img"
            />
          </div>

          <!-- Description -->
          <p class="text-body-2 text--secondary mb-4">
            Select the CFS slot or external spool to use for each tool required by the G-Code.
          </p>

          <!-- ── Mapping list (CFS enabled) ─────── -->
          <template v-if="enableCfs">
            <div
              v-if="physicalSlots.length === 0"
              class="cfs-no-slots text-center py-4 mb-4"
            >
              <v-icon
                class="mb-2"
                color="secondary"
              >
                $filament
              </v-icon>
              <div class="text-body-2 text--secondary">
                No CFS slots detected. Load filament into the CFS or disable CFS below.
              </div>
            </div>

            <div
              v-else
              class="cfs-mapping-list mb-4"
            >
              <div
                v-for="(tool, i) in slicerTools"
                :key="i"
                class="cfs-row d-flex align-center"
              >
                <!-- Left: slicer tool -->
                <div class="d-flex align-center cfs-row-left">
                  <span
                    class="cfs-dot mr-3"
                    :style="{ background: tool.color }"
                  />
                  <div class="cfs-tool-labels">
                    <div class="text-body-2 font-weight-bold">
                      Tool {{ i }}
                    </div>
                    <div class="text-caption text--secondary">
                      {{ tool.material }}
                    </div>
                  </div>
                </div>

                <!-- Right: physical slot selector -->
                <div class="d-flex align-center cfs-row-right">
                  <v-select
                    :value="toolMapping[i]"
                    :items="physicalSlotItems"
                    item-text="label"
                    item-value="slot"
                    dense
                    outlined
                    hide-details
                    class="cfs-select"
                    @input="updateMapping(i, $event)"
                  >
                    <template #item="{ item }">
                      <span
                        class="cfs-sq mr-2"
                        :style="{ background: item.color }"
                      />
                      <span>{{ item.label }}</span>
                    </template>
                    <template #selection="{ item }">
                      <span
                        class="cfs-sq mr-2"
                        :style="{ background: item.color }"
                      />
                      <span class="text-truncate">{{ item.label }}</span>
                    </template>
                  </v-select>
                </div>
              </div>
            </div>
          </template>

          <!-- ── External spool block (CFS off) ──── -->
          <div
            v-else
            class="cfs-ext-spool d-flex align-center rounded pa-4 mb-4"
          >
            <v-icon
              color="info"
              class="mr-3 flex-shrink-0"
            >
              $alertCircle
            </v-icon>
            <div>
              <div class="text-body-2 font-weight-bold">
                External Spool Holder
              </div>
              <div class="text-caption text--secondary mt-1">
                The printer's manually loaded filament will be used for all tools.
              </div>
            </div>
          </div>

          <!-- ── Enable CFS Switch ─────────────────────── -->
          <div class="d-flex justify-center mb-4">
            <v-switch
              v-model="enableCfs"
              label="Enable CFS"
              color="primary"
              hide-details
              class="mt-0 pt-0"
            />
          </div>

          <!-- ── Material mismatch error ─────────── -->
          <v-alert
            v-if="materialMismatches.length > 0"
            type="error"
            dense
            class="mb-3"
          >
            <strong>Material mismatch!</strong>
            Wrong material temperatures can cause jams or dangerous overheating.
            <ul class="mb-0 mt-1 pl-4">
              <li
                v-for="(m, idx) in materialMismatches"
                :key="idx"
              >
                Tool {{ m.tool }}: G-Code needs
                <strong>{{ m.slicerMaterial }}</strong>, selected slot has
                <strong>{{ m.slotMaterial }}</strong>
              </li>
            </ul>
          </v-alert>

          <!-- ── Flush volume note ───────────────── -->
          <v-alert
            type="info"
            dense
            class="mb-0"
          >
            Drastically changing colors post-slicing may result in incorrect flush volumes and color bleeding.
          </v-alert>
        </template>
      </v-card-text>

      <v-divider />

      <!-- ── Footer ───────────────────────────────── -->
      <v-card-actions class="px-5 py-3">
        <v-spacer />
        <v-btn
          text
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="success"
          :disabled="loading || materialMismatches.length > 0"
          @click="confirmAndPrint"
        >
          <v-icon
            left
            small
          >
            $reprint
          </v-icon>
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

  // ─── Data ──────────────────────────────────────────────────────────────────

  loading = true
  slicerTools: SlicerTool[] = []
  physicalSlots: PhysicalSlot[] = []

  /** Use Record + $set for proper Vue 2 reactivity on index-keyed object */
  toolMapping: Record<number, number> = {}

  thumbnailUrl: string | null = null

  enableCfs = true

  // ─── Computed ──────────────────────────────────────────────────────────────

  get physicalSlotItems (): PhysicalSlot[] {
    return this.physicalSlots
  }

  /**
   * Material mismatch check.
   * Uses .includes() so "PLA-CF" is compatible with "PLA", etc.
   * Skipped entirely when CFS is disabled (external spool mode).
   */
  get materialMismatches (): Array<{ tool: number; slicerMaterial: string; slotMaterial: string }> {
    if (!this.enableCfs) return []

    const out: Array<{ tool: number; slicerMaterial: string; slotMaterial: string }> = []
    for (let i = 0; i < this.slicerTools.length; i++) {
      const slicerMat = this.slicerTools[i].material
      const slotId = this.toolMapping[i]
      const physSlot = this.physicalSlots.find(s => s.slot === slotId)
      if (!physSlot) continue
      if (
        slicerMat.toLowerCase() === 'unknown' ||
        physSlot.material.toLowerCase() === 'unknown'
      ) continue
      if (!this.materialCompatible(slicerMat, physSlot.material)) {
        out.push({ tool: i, slicerMaterial: slicerMat, slotMaterial: physSlot.material })
      }
    }
    return out
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  @Watch('value')
  async onOpen (val: boolean) {
    if (val) await this.loadData()
  }

  async mounted () {
    if (this.value) await this.loadData()
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  async loadData () {
    this.loading = true
    try {
      await this.fetchMetadata()
      await this.fetchLaneData()
      this.calculateDefaults()
    } catch (e) {
      console.error('[CFSMatchDialog] Failed to load data:', e)
    } finally {
      this.loading = false
    }
  }

  async fetchMetadata () {
    const resp = await fetch(
      `/server/files/metadata?filename=${encodeURIComponent(this.filename)}`
    )
    const json = await resp.json() as any
    const meta = json.result ?? json

    // filament_colors arrives as a real string[] from Moonraker
    let colors: string[] = this.parseStringArray(meta.filament_colors ?? meta.filament_colour)

    // filament_type arrives as a semicolon-delimited string ("PLA;PETG;ABS"),
    // NOT a string[] — must be split through parseStringArray.
    let types: string[] = this.parseStringArray(meta.filament_type)

    // Single-color / missing fallback
    if (colors.length === 0) colors = ['#FFFFFF']
    if (types.length === 0) types = ['Unknown']

    // Pad shorter array to match the longer one
    while (types.length < colors.length) types.push('Unknown')
    while (colors.length < types.length) colors.push('#FFFFFF')

    this.slicerTools = colors.map((c, i) => ({
      color: this.normalizeHex(c, '#FFFFFF'),
      material: types[i] || 'Unknown'
    }))

    // Thumbnail — largest available
    this.thumbnailUrl = this.buildThumbnailUrl(this.filename, meta.thumbnails)
  }

  async fetchLaneData () {
    this.physicalSlots = []

    let fetchedFromBox = false

    // 1. Try fetching native CFS box status first (K2 Custom Firmware box.py)
    try {
      const resp = await fetch('/printer/objects/query?box')
      const json = await resp.json() as any
      const boxStatus = json.result?.status?.box
      const slots = boxStatus?.slots

      if (Array.isArray(slots) && slots.length > 0) {
        fetchedFromBox = true
        for (const s of slots) {
          if (typeof s !== 'object' || s == null || s.index == null) continue

          const slotNum = Number(s.index)
          const mat = typeof s.material === 'string' && s.material.trim() !== '' ? s.material : 'Unknown'

          if (s.external) {
            this.physicalSlots.push({
              slot: slotNum,
              label: 'External Spool',
              color: this.normalizeHex(s.color),
              material: mat
            })
          } else {
            const letter = slotNum < 26 ? String.fromCharCode(65 + slotNum) : String(slotNum)
            this.physicalSlots.push({
              slot: slotNum,
              label: `CFS ${letter} (${mat})`,
              color: this.normalizeHex(s.color),
              material: mat
            })
          }
        }
      } else if (boxStatus?.external_spool != null) {
        // Fallback if box.slots is missing but external_spool exists
        this.physicalSlots.push({
          slot: typeof boxStatus.external_spool === 'number' ? boxStatus.external_spool : 4,
          label: 'External Spool',
          color: '#808080',
          material: 'Unknown'
        })
        fetchedFromBox = true
      }
    } catch (e) {
      console.warn('[CFSMatchDialog] Box status unavailable:', e)
    }

    // 2. If no box data, fall back to Moonraker lane_data
    if (!fetchedFromBox) {
      try {
        const resp = await fetch('/server/database/item?namespace=lane_data')
        const json = await resp.json() as any
        const laneData = json.result?.value ?? json.result ?? {}

        // In Moonraker DB, item values are often wrapped in `.value`
        let entries: unknown[] = []
        if (Array.isArray(laneData)) {
          entries = laneData
        } else {
          // If it's an object of objects, unwrap
          for (const val of Object.values(laneData as Record<string, unknown>)) {
            // Handle Moonraker { "lane1": { "value": { "tool": 1 } } }
            const unwrapped = (val && typeof val === 'object' && 'value' in val) ? (val as any).value : val
            entries.push(unwrapped)
          }
        }

        for (const lane of entries) {
          const l = lane as Record<string, unknown>
          if (l == null || typeof l !== 'object' || l.tool == null) continue

          const slotNum = Number(l.tool)
          const mat = typeof l.material === 'string' && l.material.trim() !== '' ? l.material : 'Unknown'
          const letter = slotNum < 26 ? String.fromCharCode(65 + slotNum) : String(slotNum)

          this.physicalSlots.push({
            slot: slotNum,
            label: `CFS ${letter} (${mat})`,
            color: this.normalizeHex(l.color_hex),
            material: mat
          })
        }
      } catch (e) {
        console.warn('[CFSMatchDialog] Lane data unavailable:', e)
      }
    }

    this.physicalSlots.sort((a, b) => a.slot - b.slot)

    // Auto-disable CFS if no physical slots exist
    if (this.physicalSlots.length === 0) {
      this.enableCfs = false
    }
  }

  // ─── String / Color Helpers ────────────────────────────────────────────────

  /**
   * Parses a Moonraker metadata field which may arrive as:
   *   - A real string[] array  (filament_colors)
   *   - A JSON array string    ('["PLA","PETG"]')
   *   - A semicolon-delimited string  ("PLA;PETG;ABS")
   * Mirrors the getStringArray filter used throughout the rest of the app.
   */
  parseStringArray (value: unknown, separator = ';'): string[] {
    if (Array.isArray(value)) return (value as unknown[]).map(String)
    if (typeof value !== 'string' || value === '') return []
    if (value.startsWith('["') && value.endsWith('"]')) {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed) && (parsed as unknown[]).every(x => typeof x === 'string')) {
          return parsed as string[]
        }
      } catch { /* fall through */ }
    }
    return value.split(separator).map(x => x.replace(/^"|"$/g, ''))
  }

  /** Normalize any hex color value to #RRGGBB, returning fallback for bad input. */
  normalizeHex (hex: unknown, fallback = '#808080'): string {
    if (typeof hex !== 'string' || hex === '') return fallback
    const h = hex.startsWith('#') ? hex : `#${hex}`
    return /^#[0-9A-F]{6}$/i.test(h) ? h : fallback
  }

  /**
   * Smart material compatibility check using substring matching.
   * "PLA-CF" is compatible with "PLA"; "PETG" is NOT compatible with "PLA".
   */
  materialCompatible (a: string, b: string): boolean {
    const al = a.toLowerCase()
    const bl = b.toLowerCase()
    return al.includes(bl) || bl.includes(al)
  }

  /**
   * Builds a thumbnail URL from the raw Moonraker metadata thumbnails array.
   * Picks the largest available thumbnail (by pixel area) and constructs
   * a relative /server/files URL that works without the files mixin.
   */
  buildThumbnailUrl (filename: string, thumbnails: unknown): string | null {
    if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null
    const best = (thumbnails as Array<{ relative_path?: string; width?: number; height?: number; size?: number }>)
      .filter(t => t.relative_path)
      .reduce((prev, cur) =>
        ((cur.width ?? 0) * (cur.height ?? 0)) > ((prev.width ?? 0) * (prev.height ?? 0)) ? cur : prev
      )
    if (!best?.relative_path) return null
    // Build directory path from filename (strip the filename itself)
    const parts = filename.split('/')
    parts.pop()
    const dir = parts.join('/')
    const base = dir ? `gcodes/${dir}` : 'gcodes'
    const encoded = best.relative_path
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
    return `/server/files/${base}/${encoded}?date=${Date.now()}`
  }

  hexToRgb (hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    return [
      parseInt(h.substring(0, 2), 16) || 0,
      parseInt(h.substring(2, 4), 16) || 0,
      parseInt(h.substring(4, 6), 16) || 0
    ]
  }

  colorDistance (a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
  }

  /** Returns the color of whichever physical slot is currently mapped to tool index. */
  getSelectedSlotColor (index: number): string {
    const slotId = this.toolMapping[index]
    if (slotId == null) return '#808080'
    return this.physicalSlots.find(s => s.slot === slotId)?.color ?? '#808080'
  }

  // ─── Mapping Logic ─────────────────────────────────────────────────────────

  /** Reactive assignment using $set for Vue 2 object key observation. */
  updateMapping (index: number, value: number) {
    this.$set(this.toolMapping, index, value)
  }

  /**
   * 4-tier auto-mapping algorithm (runs on dialog open):
   *   1. Perfect match  — same material AND near-identical color (dist < 10)
   *   2. Type match     — same material, pick closest color
   *   3. Color match    — closest color regardless of material
   *   4. Fallback       — first available slot
   */
  calculateDefaults () {
    const newMapping: Record<number, number> = {}
    const usedSlots = new Set<number>()

    for (let i = 0; i < this.slicerTools.length; i++) {
      const tool = this.slicerTools[i]
      const toolRgb = this.hexToRgb(tool.color)
      const available = this.physicalSlots.filter(s => !usedSlots.has(s.slot))
      let bestSlot: number | null = null

      // 1. Perfect match: compatible material + nearly exact color
      for (const ps of available) {
        if (
          this.materialCompatible(tool.material, ps.material) &&
          this.colorDistance(toolRgb, this.hexToRgb(ps.color)) < 10
        ) {
          bestSlot = ps.slot
          break
        }
      }

      // 2. Type match: compatible material, closest color wins
      if (bestSlot === null) {
        const typeMatches = available.filter(ps =>
          this.materialCompatible(tool.material, ps.material)
        )
        if (typeMatches.length > 0) {
          let bestDist = Infinity
          for (const ps of typeMatches) {
            const d = this.colorDistance(toolRgb, this.hexToRgb(ps.color))
            if (d < bestDist) { bestDist = d; bestSlot = ps.slot }
          }
        }
      }

      // 3. Color match: any material, closest color
      if (bestSlot === null && available.length > 0) {
        let bestDist = Infinity
        for (const ps of available) {
          const d = this.colorDistance(toolRgb, this.hexToRgb(ps.color))
          if (d < bestDist) { bestDist = d; bestSlot = ps.slot }
        }
      }

      // 4. Fallback: first remaining slot
      if (bestSlot === null && available.length > 0) {
        bestSlot = available[0].slot
      }

      if (bestSlot !== null) {
        this.$set(newMapping, i, bestSlot)
        usedSlots.add(bestSlot)
      }
    }

    this.toolMapping = newMapping
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  cancel () {
    this.$emit('input', false)
  }

  async confirmAndPrint () {
    try {
      if (this.enableCfs && this.physicalSlots.length > 0) {
        // Build and send the routing command
        const parts: string[] = []
        for (let i = 0; i < this.slicerTools.length; i++) {
          if (this.toolMapping[i] != null) {
            parts.push(`T${i}=${this.toolMapping[i]}`)
          }
        }
        if (parts.length > 0) {
          await SocketActions.printerGcodeScript(`BOX_SET_ROUTING ${parts.join(' ')}`)
        }
      }

      await SocketActions.printerPrintStart(this.filename)
    } catch (e) {
      console.error('[CFSMatchDialog] Failed to start print:', e)
    }

    this.$emit('input', false)

    if (this.$route?.name !== 'home') {
      this.$router.push({ name: 'home' })
    }
  }
}
</script>

<style lang="scss" scoped>
// ─────────────────────────────────────────────────────────────────────────────
// Card & header
// ─────────────────────────────────────────────────────────────────────────────

.cfs-card {
  overflow: hidden;
}

.cfs-header {
  // Slightly elevated heading area — matches Fluidd's card-heading color
  background-color: var(--v-card-heading-base, #333337);
  min-height: 52px;
}

.cfs-body {
  // Allow the body to scroll on small screens
  overflow-y: auto;
  max-height: 70vh;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail
// ─────────────────────────────────────────────────────────────────────────────

.cfs-thumb-wrap {
  background: radial-gradient(ellipse at center, #2d2d44 0%, #18182a 100%);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.5);
}

.cfs-thumb-img {
  display: block;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping list
// ─────────────────────────────────────────────────────────────────────────────

.cfs-no-slots {
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
}

.cfs-mapping-list {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.cfs-row {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  gap: 12px;
  transition: background 0.12s ease;

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.cfs-row-left {
  min-width: 140px;
  flex-shrink: 0;
}

.cfs-row-right {
  flex: 1 1 auto;
  justify-content: flex-end;
  min-width: 0;
}

.cfs-tool-labels {
  min-width: 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color swatches
// ─────────────────────────────────────────────────────────────────────────────

// Circular swatch for slicer tools (20 px, white ring)
.cfs-dot {
  display: inline-block;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

// Small square swatch for physical slot indicators
.cfs-sq {
  display: inline-block;
  width: 14px;
  height: 14px;
  min-width: 14px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

// Keep swatches visible inside v-select item/selection slots
:deep(.v-list-item) .cfs-sq {
  display: inline-block;
}

// ─────────────────────────────────────────────────────────────────────────────
// Select styling
// ─────────────────────────────────────────────────────────────────────────────

.cfs-select {
  max-width: 200px;

  :deep(.v-input__slot) {
    min-height: 36px !important;
  }

  :deep(.v-select__selections) {
    flex-wrap: nowrap;
    overflow: hidden;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// External spool block
// ─────────────────────────────────────────────────────────────────────────────

.cfs-ext-spool {
  border: 1px solid rgba(33, 150, 243, 0.3);
  background: rgba(33, 150, 243, 0.07);
}

</style>
