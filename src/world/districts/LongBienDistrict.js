import { longBienMapData } from '../map/data/longBienMapData.js'
import { ProceduralMapDistrict } from './ProceduralMapDistrict.js'

export class LongBienDistrict extends ProceduralMapDistrict {
  constructor(options) {
    super({ ...options, mapData: longBienMapData })
    this.group.name = 'Long Biên - Đồng Xuân'
  }
}
