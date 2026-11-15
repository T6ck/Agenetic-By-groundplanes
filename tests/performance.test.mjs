import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const app = readFileSync('public/app.js', 'utf8');
const contextCode = app.slice(app.indexOf('function selectContext'), app.indexOf('async function run(agent'));

test('large attached vault scans a fixed excerpt budget and skips unattached text', () => {
  let reads = 0;
  const article = 'sample notes with a thermal conclusion '.repeat(70_000);
  const files = [{id: 'unattached', get text() {throw new Error('Unattached note read');}}];
  for (let index = 0; index < 12_000; index++) {
    files.push({id: 'note-' + index, name: 'Note ' + index, get text() {reads++;return article;}});
  }
  const pick = runInNewContext(contextCode + '\nselectContext', {data: {files}});
  const selected = pick({files: files.slice(1).map(file => file.id)}, 'thermal conclusion');
  assert.ok(selected.text.length <= 4100);
  assert.match(selected.text, /thermal conclusion/);
  assert.ok(reads < 1500, 'The scan visited more than the capped prefix of the attached vault.');
  assert.equal(pick({files: []}, 'question').text, '');
});
