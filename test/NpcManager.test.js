import test from 'node:test'
import assert from 'node:assert/strict'
import { NpcManager } from '../src/npcs/NpcManager.js'

function actorStub() {
  return {
    active: false,
    setActive(value) { this.active = value },
    updateCalls: 0,
    update() { this.updateCalls += 1 },
    getInteraction: () => null,
    disposeCalls: 0,
    dispose() { this.disposeCalls += 1 },
  }
}

test('role activation is staggered and never duplicates actors', () => {
  const manager = new NpcManager({ x: 0, z: 0 })
  const actors = [actorStub(), actorStub(), actorStub()]
  actors.forEach((actor) => manager.add(actor, { role: 'visitors' }))

  manager.setRoleActive('visitors', true, { stagger: 0.1 })
  manager.update(0.05, 'outdoor')
  assert.deepEqual(actors.map((actor) => actor.active), [true, false, false])
  manager.update(0.05, 'outdoor')
  manager.update(0.05, 'outdoor')
  assert.deepEqual(actors.map((actor) => actor.active), [true, true, false])
  manager.update(0.05, 'outdoor')
  manager.update(0.05, 'outdoor')
  assert.deepEqual(actors.map((actor) => actor.active), [true, true, true])
  assert.equal(manager.entries.length, 3)
  manager.dispose()
})

test('deactivation cancels pending scheduled activations', () => {
  const manager = new NpcManager({ x: 0, z: 0 })
  const actor = actorStub()
  manager.add(actor, { role: 'service' })
  manager.setRoleActive('service', true, { stagger: 2 })
  manager.setRoleActive('service', false)
  for (let frame = 0; frame < 60; frame += 1) manager.update(0.05, 'outdoor')

  assert.equal(actor.active, false)
  manager.dispose()
})
