import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

test('native picker adds the registered GGUF to the workspace exactly once and reports errors', async () => {
  const model = {id: 'a'.repeat(24), name: 'research model.gguf', size: 25 * 1024 ** 3};
  const data = {profile: {id: 'profile'}, models: []};
  const space = {id: 'space', members: []};
  let result = {model};
  const context = {
    window: {ageneticDesktop: {chooseModel: async () => result}},
    document: {addEventListener() {}},
    setInterval() {},
    data,
    activeSpace: () => space,
    change: async apply => { apply(); return true; },
    crypto: {randomUUID: () => 'workspace-model'},
  };
  const pick = runInNewContext(readFileSync('public/models.js', 'utf8') + '\npickCompanionModel', context);
  assert.equal(await pick(), model);
  await pick();
  assert.equal(data.models.length, 1);
  assert.equal(data.models[0].companionId, model.id);
  assert.deepEqual(space.members, ['workspace-model']);
  result = {cancelled: true};
  assert.equal(await pick(), null);
  result = {error: 'Could not read the GGUF file.'};
  await assert.rejects(pick(), /Could not read the GGUF file/);
});
