import {
  DEFAULT_PROFILE,
  formatSlot,
  groupSlots,
  formatSlotCommand,
  formatSlotClearCommand,
  normalizeMaterial,
  normalizeColor
} from '../types'

describe('FilamentBox types and helpers', () => {
  describe('normalizeMaterial and normalizeColor', () => {
    it('normalizes material strings', () => {
      expect(normalizeMaterial(' pla ')).toBe('PLA')
      expect(normalizeMaterial(null)).toBe('')
      expect(normalizeMaterial(undefined)).toBe('')
    })

    it('validates and normalizes hex colors', () => {
      expect(normalizeColor('#ff0000')).toBe('#FF0000')
      expect(normalizeColor('invalid', '#123456')).toBe('#123456')
      expect(normalizeColor(undefined)).toBe(DEFAULT_PROFILE.color)
    })
  })

  describe('formatSlot', () => {
    it('marks external slot as unloaded when material is default/empty', () => {
      const slot = {
        index: 4,
        external: true,
        present: false,
        loaded: false,
        material: '--',
        color: '#6F7379'
      }
      const formatted = formatSlot(slot, true)
      expect(formatted.external).toBe(true)
      expect(formatted.state).toBe('unloaded')
      expect(formatted.loaded).toBe(false)
    })

    it('marks external slot as ready when material is configured', () => {
      const slot = {
        index: 4,
        external: true,
        present: false,
        loaded: false,
        material: 'PLA',
        color: '#FF0000'
      }
      const formatted = formatSlot(slot, true)
      expect(formatted.external).toBe(true)
      expect(formatted.state).toBe('ready')
      expect(formatted.material).toBe('PLA')
    })

    it('marks physical slot as unloaded when not present', () => {
      const slot = {
        index: 1,
        external: false,
        present: false,
        loaded: false,
        material: 'PLA',
        color: '#00FF00'
      }
      const formatted = formatSlot(slot, true)
      expect(formatted.state).toBe('unloaded')
      expect(formatted.present).toBe(false)
    })

    it('marks physical slot as ready when present but not loaded', () => {
      const slot = {
        index: 0,
        external: false,
        present: true,
        loaded: false,
        material: 'PLA',
        color: '#00FF00'
      }
      const formatted = formatSlot(slot, true)
      expect(formatted.state).toBe('ready')
      expect(formatted.present).toBe(true)
      expect(formatted.loaded).toBe(false)
    })

    it('marks slot as loaded when loaded flag is true', () => {
      const slot = {
        index: 0,
        external: false,
        present: true,
        loaded: true,
        material: 'PETG',
        color: '#0000FF'
      }
      const formatted = formatSlot(slot, true)
      expect(formatted.state).toBe('loaded')
      expect(formatted.loaded).toBe(true)
    })
  })

  describe('groupSlots', () => {
    it('separates external slot into its own group and batches CFS into boxes of 4', () => {
      const slots = [
        formatSlot({ index: 0, external: false, present: true, loaded: false, material: 'PLA' }, true),
        formatSlot({ index: 1, external: false, present: false, loaded: false, material: 'PETG' }, true),
        formatSlot({ index: 2, external: false, present: false, loaded: false, material: '--' }, true),
        formatSlot({ index: 3, external: false, present: false, loaded: false, material: '--' }, true),
        formatSlot({ index: 4, external: true, present: false, loaded: false, material: '--' }, true)
      ]
      const groups = groupSlots(slots)
      expect(groups).toHaveLength(2)
      expect(groups[0].external).toBe(true)
      expect(groups[0].key).toBe('external')
      expect(groups[0].slots).toHaveLength(1)
      expect(groups[1].external).toBe(false)
      expect(groups[1].key).toBe('box-1')
      expect(groups[1].slots).toHaveLength(4)
    })
  })

  describe('formatSlotCommand & formatSlotClearCommand', () => {
    it('generates correct slot set command', () => {
      const cmd = formatSlotCommand(1, {
        material: 'PLA',
        color: '#FF0000',
        brand: 'Polymaker',
        name: 'PolyLite'
      })
      expect(cmd).toBe('_BOX_SLOT_SET SLOT=1 MATERIAL=PLA COLOR="#FF0000" BRAND=Polymaker NAME=PolyLite')

      const cmdWithSpaces = formatSlotCommand(0, {
        material: 'PETG HF',
        color: '#00FF00',
        brand: 'Bambu Lab',
        name: 'PETG Basic'
      }, {
        spoolmanSupported: true,
        spoolmanId: 42
      })
      expect(cmdWithSpaces).toBe('_BOX_SLOT_SET SLOT=0 MATERIAL="PETG HF" COLOR="#00FF00" BRAND="Bambu Lab" NAME="PETG Basic" SPOOLMAN_ID=42')
    })

    it('generates correct slot clear command for a single slot', () => {
      expect(formatSlotClearCommand(1)).toBe('_BOX_SLOT_CLEAR SLOT=1')
    })

    it('generates correct slot clear command for ALL slots', () => {
      expect(formatSlotClearCommand('ALL')).toBe('_BOX_SLOT_CLEAR SLOT=ALL')
    })
  })
})
