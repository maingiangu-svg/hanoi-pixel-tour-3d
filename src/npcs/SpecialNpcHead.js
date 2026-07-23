import * as THREE from 'three'

function setTransform(object, {
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
} = {}) {
  object.position.set(...position)
  object.scale.set(...scale)
  object.rotation.set(...rotation)
  return object
}

function createMesh(resources, {
  name,
  geometry = 'box',
  color,
  material = null,
  parent,
  position,
  scale,
  rotation,
  castShadow = false,
  materialOptions = {},
}) {
  const mesh = new THREE.Mesh(
    resources.getGeometry(geometry),
    material ?? resources.getMaterial(color, materialOptions),
  )
  mesh.name = name
  mesh.castShadow = castShadow
  mesh.receiveShadow = false
  setTransform(mesh, { position, scale, rotation })
  parent.add(mesh)
  return mesh
}

function faceFrontZ(profile) {
  return (profile.head?.scale?.[2] ?? 0.36) * 0.5
}

export function createWrappedHeadMaterial({
  texture,
  skinColor,
  face = {},
}) {
  if (!texture) return null
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.MeshStandardMaterial({
    color: skinColor,
    map: texture,
    flatShading: true,
    roughness: 0.86,
    metalness: 0,
    transparent: false,
    depthWrite: true,
    toneMapped: true,
  })
  material.name = 'Special wrapped face material'
  const projection = face.projection ?? {}
  const centerX = projection.centerX ?? 0.5
  const centerY = projection.centerY ?? 0.52
  const radiusX = Math.min(projection.radiusX ?? 0.24, 0.25)
  const radiusY = projection.radiusY ?? 0.42
  const feather = projection.feather ?? 0.18
  const frontNormalStart = Math.max(0, projection.frontNormalStart ?? 0.08)
  const frontNormalFull = Math.max(
    frontNormalStart + 0.01,
    projection.frontNormalFull ?? 0.34,
  )
  material.userData.faceProjection = Object.freeze({
    centerX,
    centerY,
    radiusX,
    radiusY,
    feather,
    frontNormalStart,
    frontNormalFull,
  })

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSpecialObjectNormal;',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvSpecialObjectNormal = normalize(objectNormal);',
      )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vSpecialObjectNormal;',
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
        #ifdef USE_MAP
          vec4 faceSample = texture2D(map, vMapUv);
          vec2 faceDelta = vec2(
            (vMapUv.x - ${centerX.toFixed(4)}) / ${radiusX.toFixed(4)},
            (vMapUv.y - ${centerY.toFixed(4)}) / ${radiusY.toFixed(4)}
          );
          float faceDistance = length(faceDelta);
          float faceMask = 1.0 - smoothstep(
            ${(1 - feather).toFixed(4)},
            1.0,
            faceDistance
          );
          faceMask *= faceSample.a;
          float frontHemisphereMask = smoothstep(
            ${frontNormalStart.toFixed(4)},
            ${frontNormalFull.toFixed(4)},
            vSpecialObjectNormal.z
          );
          faceMask *= frontHemisphereMask;
          diffuseColor.rgb = mix(diffuseColor.rgb, faceSample.rgb, faceMask);
        #endif
      `,
    )
  }
  material.customProgramCacheKey = () => [
    'special-wrapped-face',
    centerX,
    centerY,
    radiusX,
    radiusY,
    feather,
    frontNormalStart,
    frontNormalFull,
    'front-only-v2',
  ].join(':')
  return material
}

export function createProceduralFaceDetails({
  profile,
  resources,
  headRoot,
}) {
  const face = profile.face ?? {}
  const eyes = face.eyes ?? {}
  const brows = face.brows ?? {}
  const mouth = face.mouth ?? {}
  const frontZ = faceFrontZ(profile)
  const group = new THREE.Group()
  group.name = 'Special.FaceDetails'
  group.rotation.set(...(face.rotation ?? [0, 0, 0]))
  group.position.set(face.offsetX ?? 0, face.offsetY ?? 0, 0)
  group.scale.setScalar(face.scale ?? 1)
  headRoot.add(group)

  const eyeSpacing = eyes.spacing ?? 0.18
  const eyeY = eyes.positionY ?? 0.04
  const eyeScale = eyes.scale ?? [0.052, 0.038, 0.026]
  for (const side of [-1, 1]) {
    createMesh(resources, {
      name: `Special.Face.EyeWhite.${side < 0 ? 'L' : 'R'}`,
      geometry: 'sphereLow',
      color: eyes.scleraColor ?? 0xeee7dc,
      parent: group,
      position: [side * eyeSpacing * 0.5, eyeY, frontZ + 0.006],
      scale: eyeScale,
    })
    createMesh(resources, {
      name: `Special.Face.Pupil.${side < 0 ? 'L' : 'R'}`,
      geometry: 'sphereLow',
      color: eyes.irisColor ?? 0x2a211d,
      parent: group,
      position: [side * eyeSpacing * 0.5, eyeY, frontZ + 0.022],
      scale: [eyeScale[0] * 0.42, eyeScale[1] * 0.62, 0.018],
    })

    const browTilt = (brows.arch ?? 0.02) * (side < 0 ? 1 : -1)
    createMesh(resources, {
      name: `Special.Face.Brow.${side < 0 ? 'L' : 'R'}`,
      color: brows.color ?? profile.hair?.color ?? 0x211b1a,
      parent: group,
      position: [
        side * eyeSpacing * 0.5,
        brows.positionY ?? 0.11,
        frontZ + 0.021,
      ],
      scale: [brows.width ?? 0.11, brows.thickness ?? 0.018, 0.014],
      rotation: [0, 0, browTilt],
    })
  }

  const nose = face.nose
  if (nose?.style !== 'none') {
    createMesh(resources, {
      name: 'Special.Face.Nose',
      geometry: 'sphereLow',
      color: profile.head?.shadeColor ?? profile.head?.skinColor,
      parent: group,
      position: nose?.position ?? [0, -0.015, frontZ + 0.016],
      scale: nose?.scale ?? [0.052, 0.09, 0.06],
    })
  }

  const mouthY = mouth.positionY ?? -0.12
  const mouthWidth = mouth.width ?? 0.17
  const mouthHeight = mouth.height ?? 0.04
  if (mouth.style === 'wideOpenSmile') {
    createMesh(resources, {
      name: 'Special.Face.Mouth',
      geometry: 'sphereLow',
      color: mouth.interiorColor ?? 0x4b2425,
      parent: group,
      position: [0, mouthY, frontZ + 0.018],
      scale: [mouthWidth, mouthHeight, 0.028],
    })
    createMesh(resources, {
      name: 'Special.Face.Teeth',
      color: mouth.teethColor ?? 0xf2e8cf,
      parent: group,
      position: [0, mouthY + mouthHeight * 0.13, frontZ + 0.034],
      scale: [mouthWidth * 0.78, mouthHeight * 0.3, 0.012],
    })
  } else if (mouth.style === 'gentleSmile') {
    for (const side of [-1, 1]) {
      createMesh(resources, {
        name: `Special.Face.Mouth.${side < 0 ? 'L' : 'R'}`,
        color: mouth.lipColor ?? 0xa85f5c,
        parent: group,
        position: [side * mouthWidth * 0.22, mouthY, frontZ + 0.025],
        scale: [mouthWidth * 0.55, Math.max(0.016, mouthHeight * 0.35), 0.014],
        rotation: [0, 0, side * 0.16],
      })
    }
  } else {
    createMesh(resources, {
      name: 'Special.Face.Mouth',
      color: mouth.lipColor ?? 0x9d5d5b,
      parent: group,
      position: [0, mouthY, frontZ + 0.024],
      scale: [mouthWidth, Math.max(0.014, mouthHeight * 0.45), 0.014],
      rotation: [0, 0, mouth.style === 'calmClosed' ? -0.035 : 0],
    })
  }

  return group
}

export function createLowPolyHair({ profile, resources, headRoot }) {
  const hair = profile.hair ?? {}
  const group = new THREE.Group()
  group.name = 'Special.HairGroup'
  setTransform(group, {
    position: hair.position ?? [0, 0.08, -0.05],
    scale: [1, 1, 1],
  })
  headRoot.add(group)
  const color = hair.color ?? 0x211b1a

  createMesh(resources, {
    name: 'Special.Hair.Cap',
    geometry: 'sphere',
    color,
    parent: group,
    position: [0, 0.035, -0.025],
    scale: hair.scale ?? [0.42, 0.25, 0.39],
    castShadow: true,
  })

  if (hair.style === 'longVolumetric') {
    const locks = [
      [-0.205, -0.29, -0.055, -0.05],
      [0.205, -0.29, -0.055, 0.05],
      [-0.13, -0.31, -0.12, -0.09],
      [0.13, -0.31, -0.12, 0.09],
    ]
    locks.forEach(([x, y, z, tilt], index) => {
      createMesh(resources, {
        name: `Special.Hair.Long.${index + 1}`,
        geometry: 'sphere',
        color,
        parent: group,
        position: [x, y, z],
        scale: [0.13, 0.55, 0.16],
        rotation: [0, 0, tilt],
        castShadow: index < 2,
      })
    })
    for (const [index, x] of [-0.12, 0, 0.12].entries()) {
      createMesh(resources, {
        name: `Special.Hair.Bang.${index + 1}`,
        geometry: 'sphereLow',
        color,
        parent: group,
        position: [x, -0.04, 0.16],
        scale: [0.13, 0.22, 0.095],
        rotation: [0.08, 0, x * -0.8],
      })
    }
    return group
  }

  const clusterCount = THREE.MathUtils.clamp(
    Math.round(hair.spikeCount ?? (hair.style === 'spiky' ? 7 : 6)),
    4,
    10,
  )
  for (let index = 0; index < clusterCount; index += 1) {
    const angle = (index / clusterCount) * Math.PI * 2
    const radius = index % 2 === 0 ? 0.15 : 0.11
    const y = 0.14 + (index % 3) * 0.035
    createMesh(resources, {
      name: `Special.Hair.Cluster.${index + 1}`,
      geometry: hair.style === 'spiky' ? 'cone' : 'sphereLow',
      color,
      parent: group,
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.72],
      scale: hair.style === 'spiky'
        ? [0.13, 0.24 - (index % 2) * 0.035, 0.13]
        : [0.18, 0.16, 0.16],
      rotation: [
        Math.sin(angle) * 0.24,
        0,
        -Math.cos(angle) * 0.24,
      ],
      castShadow: index < 3,
    })
  }
  return group
}

export function createLowPolyGlasses({ profile, resources, headRoot }) {
  const glasses = profile.glasses ?? {}
  const group = new THREE.Group()
  group.name = 'Special.GlassesGroup'
  setTransform(group, {
    position: glasses.position ?? [0, 0.025, 0.195],
    scale: glasses.scale ?? [1, 1, 1],
    rotation: glasses.rotation ?? [0, 0, 0],
  })
  headRoot.add(group)
  if (glasses.enabled === false) return group

  const frameColor = glasses.frameColor ?? 0x25272a
  const lensColor = glasses.lensColor ?? 0x5b646b
  const lensOpacity = THREE.MathUtils.clamp(glasses.lensOpacity ?? 0.22, 0, 1)
  const rectangular = glasses.style === 'rectangular'
  const lensX = rectangular ? 0.105 : 0.095
  const lensScale = rectangular ? [0.155, 0.1, 1] : [0.14, 0.105, 1]
  for (const side of [-1, 1]) {
    createMesh(resources, {
      name: `Special.Glasses.Frame.${side < 0 ? 'L' : 'R'}`,
      geometry: 'frame',
      color: frameColor,
      parent: group,
      position: [side * lensX, 0, 0],
      scale: lensScale,
    })
    createMesh(resources, {
      name: `Special.Glasses.Lens.${side < 0 ? 'L' : 'R'}`,
      color: lensColor,
      parent: group,
      position: [side * lensX, 0, -0.006],
      scale: [lensScale[0] * 0.72, lensScale[1] * 0.42, 0.009],
      materialOptions: {
        roughness: 0.35,
        transparent: lensOpacity < 1,
        opacity: lensOpacity,
        depthWrite: lensOpacity >= 0.5,
      },
    })
    createMesh(resources, {
      name: `Special.Glasses.Temple.${side < 0 ? 'L' : 'R'}`,
      color: frameColor,
      parent: group,
      position: [side * (lensX + lensScale[0] * 0.55), 0, -0.07],
      scale: [0.012, 0.012, glasses.templeLength ?? 0.23],
      rotation: [0, side * -0.08, 0],
    })
  }
  createMesh(resources, {
    name: 'Special.Glasses.Bridge',
    color: frameColor,
    parent: group,
    position: [0, 0.005, 0],
    scale: [glasses.bridgeWidth ?? 0.07, glasses.frameThickness ?? 0.018, 0.012],
  })
  return group
}

export function createLowPolyHead({
  profile,
  resources,
  parent,
  castShadow = true,
}) {
  const head = profile.head ?? {}
  const headRoot = new THREE.Group()
  headRoot.name = 'Special.HeadRoot'
  headRoot.position.set(...(head.position ?? [0, 1.53, 0]))
  parent.add(headRoot)

  const skinMaterial = resources.getMaterial(head.skinColor ?? profile.skinColor)
  const headMesh = createMesh(resources, {
    name: 'Special.HeadMesh',
    geometry: 'head',
    material: skinMaterial,
    parent: headRoot,
    scale: head.scale ?? [0.38, 0.43, 0.36],
    castShadow,
  })

  for (const side of [-1, 1]) {
    createMesh(resources, {
      name: `Special.Ear.${side < 0 ? 'L' : 'R'}`,
      geometry: 'sphereLow',
      color: head.skinColor ?? profile.skinColor,
      parent: headRoot,
      position: [side * (head.scale?.[0] ?? 0.38) * 0.52, -0.005, 0],
      scale: [0.055, 0.085, 0.045],
    })
  }

  const faceDetails = createProceduralFaceDetails({ profile, resources, headRoot })
  const hairGroup = createLowPolyHair({ profile, resources, headRoot })
  const glassesGroup = createLowPolyGlasses({ profile, resources, headRoot })
  let wrappedMaterial = null

  function setFaceTexture(texture) {
    wrappedMaterial?.dispose()
    wrappedMaterial = null
    if (!texture) {
      headMesh.material = skinMaterial
      faceDetails.visible = true
      return false
    }
    const imageWidth = texture.image?.naturalWidth ?? texture.image?.width ?? 0
    const imageHeight = texture.image?.naturalHeight ?? texture.image?.height ?? 0
    if (imageWidth > 512 || imageHeight > 512) {
      headMesh.material = skinMaterial
      faceDetails.visible = true
      return false
    }
    wrappedMaterial = createWrappedHeadMaterial({
      texture,
      skinColor: head.skinColor ?? profile.skinColor,
      face: profile.face,
    })
    headMesh.material = wrappedMaterial
    faceDetails.visible = false
    return true
  }

  function dispose() {
    wrappedMaterial?.dispose()
    wrappedMaterial = null
  }

  return {
    headRoot,
    headMesh,
    faceDetails,
    hairGroup,
    glassesGroup,
    setFaceTexture,
    dispose,
  }
}
