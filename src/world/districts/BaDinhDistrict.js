import { baDinhMapData } from '../map/data/baDinhMapData.js'
import { ProceduralMapDistrict } from './ProceduralMapDistrict.js'

export class BaDinhDistrict extends ProceduralMapDistrict {
  constructor(options) {
    super({ ...options, mapData: baDinhMapData })
    this.group.name = 'Ba Đình - Văn Miếu'
  }
}
