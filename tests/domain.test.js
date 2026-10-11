import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTask, validateBackup, metrics } from '../src/domain.js';
const task = { id: 'one', title: 'Проверить проект', points: 3, status: 'todo', priority: 'high', sprint: true };
test('пустое название и некорректные оценки отклоняются', () => {
  assert.throws(() => validateTask({ ...task, title: ' ' }));
  for (const points of [-1,0,1.5,22,NaN]) assert.throws(() => validateTask({ ...task, points }));
});
test('невозможная дата не попадает в карточку', () => assert.throws(() => validateTask({ ...task, due: '2026-02-30' })));
test('спринт не включает задачи из бэклога вне спринта', () => {
  const tasks = [task, { ...task, id: 'two', points: 5, status: 'done' }, { ...task, id: 'three', points: 21, sprint: false }];
  assert.deepEqual(metrics(tasks), { planned: 8, done: 5, remaining: 3, progress: 63, wip: 0 });
});
test('пустой спринт имеет нулевой прогресс', () => assert.equal(metrics([]).progress, 0));
test('импорт проверяет формат и уникальность задач до замены данных', () => {
  assert.throws(() => validateBackup({ version: 1, tasks: [task, task] }));
  assert.throws(() => validateBackup({ version: 2, tasks: [] }));
  assert.equal(validateBackup({ version: 1, tasks: [task] })[0].title, task.title);
});
