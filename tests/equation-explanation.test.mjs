import test from 'node:test';
import assert from 'node:assert/strict';
import {presetFor} from '../dist/data/catalog.js';
import {calculate} from '../dist/engine/model.js';

test('ice-hunter coverage explanation includes the squared penalty and its actual value', () => {
  const a = calculate({...presetFor('moon', 'balanced'), scenario: 'lunar-ice', inclination: 42.5});
  assert.equal(a.polarFactor, .25);
  const note = a.checks.find(c => c.id === 'orbit').why;
  assert.match(note, /\^2/);
  assert.match(note, /25\.0%/);
  assert.match(note, /not percent surface mapped/);
  assert.match(note, /seconds \/ 60/);
});
