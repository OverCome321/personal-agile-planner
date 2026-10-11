export const STATUSES = ['backlog', 'todo', 'doing', 'done'];
export function validateTask(value) {
  if (!value || typeof value !== 'object') throw new Error('Нужна карточка задачи.');
  const title = String(value.title || '').trim();
  if (!title || title.length > 120) throw new Error('Название должно содержать от 1 до 120 символов.');
  const points = Number(value.points);
  if (!Number.isInteger(points) || points < 1 || points > 21) throw new Error('Оценка должна быть целым числом от 1 до 21.');
  const status = value.status || 'backlog';
  if (!STATUSES.includes(status)) throw new Error('Неизвестное состояние задачи.');
  if (!['low', 'normal', 'high'].includes(value.priority)) throw new Error('Неизвестный приоритет.');
  const due = value.due || '';
  if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || new Date(due).toISOString().slice(0,10) !== due)) throw new Error('Укажи корректную дату.');
  return { id: String(value.id || crypto.randomUUID()), title, points, status, priority: value.priority, due, sprint: Boolean(value.sprint), note: String(value.note || '').slice(0,2000) };
}
export function metrics(tasks) {
  const active = tasks.filter(task => task.sprint);
  const planned = active.reduce((sum, task) => sum + task.points, 0);
  const done = active.filter(task => task.status === 'done').reduce((sum, task) => sum + task.points, 0);
  return { planned, done, remaining: planned - done, progress: planned ? Math.round(done / planned * 100) : 0, wip: active.filter(task => task.status === 'doing').length };
}
export function validateBackup(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.tasks) || value.tasks.length > 500) throw new Error('Нужен файл резервной копии планировщика, не более 500 задач.');
  const tasks = value.tasks.map(validateTask);
  if (new Set(tasks.map(task => task.id)).size !== tasks.length) throw new Error('В копии есть повторяющиеся идентификаторы задач.');
  return tasks;
}
