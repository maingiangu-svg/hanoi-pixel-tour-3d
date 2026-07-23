import * as THREE from 'three'
import { ChurchFacade } from './ChurchFacade.js'
import { ChurchTowers } from './ChurchTowers.js'
import { ChurchNave } from './ChurchNave.js'
import { ChurchRoof } from './ChurchRoof.js'
import { CHURCH_DIMENSIONS } from './ChurchDimensions.js'
import { assertChurchMaterials } from './ChurchMaterials.js'
import { createChurchColliderSpecs } from './ChurchColliders.js'

export class ChurchBuilding {
  constructor({ kit, parent, colliders }) {
    assertChurchMaterials(kit)

    this.kit = kit
    this.group = new THREE.Group()
    this.group.name = 'Nhà thờ Lớn Hà Nội'
    this.group.userData.dimensions = CHURCH_DIMENSIONS
    this.facadeLights = []
    parent.add(this.group)

    const facade = new ChurchFacade({ kit, parent: this.group })
    const towers = new ChurchTowers({ kit, parent: this.group })
    const nave = new ChurchNave({ kit, parent: this.group })
    const roof = new ChurchRoof({ kit, parent: this.group })

    this.parts = Object.freeze({
      facade: facade.group,
      towers: towers.group,
      nave: nave.group,
      roof: roof.group,
      details: facade.detailsGroup ?? null,
    })

    this.colliderSpecs = createChurchColliderSpecs()
    if (colliders) {
      colliders.push(...this.colliderSpecs.map((collider) => ({ ...collider })))
    }

    this.#buildFacadeLighting()
  }

  #buildFacadeLighting() {
    for (const x of [CHURCH_DIMENSIONS.towerCentersX[0], 0, CHURCH_DIMENSIONS.towerCentersX[1]]) {
      const central = x === 0
      const light = new THREE.SpotLight(
        0xf2bd76,
        central ? 24 : 27,
        48,
        Math.PI / 8,
        0.68,
        1.25,
      )
      light.name = central ? 'Đèn rọi mặt tiền trung tâm' : 'Đèn rọi tháp chuông'
      light.position.set(x, 1.05, -6.8)
      light.target.position.set(x, central ? 14 : 18, CHURCH_DIMENSIONS.facadeZ - 0.4)
      this.group.add(light, light.target)
      this.facadeLights.push(light)
    }
  }
}
