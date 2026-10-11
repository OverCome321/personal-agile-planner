import { validateTask, validateBackup, metrics } from './domain.js';
const KEY = 'nedelya.agile.v1';
const names = { backlog: 'Бэклог', todo: 'К выполнению', doing: 'В работе', done: 'Готово' };
const priorities = { high: 'Высокий', normal: 'Обычный', low: 'Низкий' };
const seed = [
  { id: 't1', title: 'Сформулировать цель спринта', priority: 'high', points: 2, status: 'done', sprint: true, note: 'Одно предложение и понятный критерий завершения.' },
  { id: 't2', title: 'Разобрать конспект по Python', priority: 'high', points: 3, status: 'doing', sprint: true, note: 'Повторить работу с файлами и составить три примера.' },
  { id: 't3', title: 'Проверить формулы в отчёте', priority: 'normal', points: 2, status: 'todo', sprint: true },
  { id: 't4', title: 'Пройти тренировку английского', priority: 'normal', points: 3, status: 'todo', sprint: true },
  { id: 't5', title: 'Запланировать следующую неделю', priority: 'low', points: 2, status: 'backlog', sprint: true },
  { id: 't6', title: 'Прочитать главу о Git', priority: 'normal', points: 3, status: 'backlog', sprint: false },
].map(validateTask);
let tasks, view = 'sprint', editing = null, dragging = null, toastTimer;
const $ = selector => document.querySelector(selector);
const form = $('#task-form'), editor = $('#editor');
try {
  const stored = localStorage.getItem(KEY);
  tasks = stored ? validateBackup(JSON.parse(stored)) : seed;
} catch { tasks = seed; toast('Сохранённые данные не удалось прочитать. Показан учебный пример; импортируй резервную копию.'); }
$('#today').textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
function toast(message) {
  const box = $('#toast'); box.textContent = message; box.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.style.display = 'none'; }, 6000);
}
function persist(next, message) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, tasks: next })); }
  catch { toast('Не удалось сохранить данные. Освободи место в браузере или скачай резервную копию.'); return false; }
  tasks = next; render(); if (message) toast(message); return true;
}
function text(tag, content, className) {
  const element = document.createElement(tag); element.textContent = content;
  if (className) element.className = className; return element;
}
function render() {
  const m = metrics(tasks);
  $('#progress-label').textContent = `${m.done} из ${m.planned} баллов завершено`;
  $('#progress').value = m.progress;
  $('#progress').setAttribute('aria-label', `Выполнено ${m.progress}% спринта`);
  $('#wip').textContent = m.wip > 2 ? `В работе ${m.wip} задач. Попробуй завершить начатое.` : `В работе: ${m.wip}. Лимит — 2 задачи.`;
  const query = $('#search').value.trim().toLocaleLowerCase('ru');
  const priority = $('#priority-filter').value;
  const visible = tasks.filter(task => (view === 'all' || task.sprint) && (priority === 'all' || priority === task.priority) && `${task.title} ${task.note}`.toLocaleLowerCase('ru').includes(query));
  const order = { high: 0, normal: 1, low: 2 };
  visible.sort((a,b) => order[a.priority] - order[b.priority] || (a.due || '9999').localeCompare(b.due || '9999'));
  $('#count').textContent = `Показано задач: ${visible.length}`;
  for (const column of document.querySelectorAll('.column')) {
    const subset = visible.filter(task => task.status === column.dataset.status);
    const holder = column.querySelector('.cards'); holder.replaceChildren();
    column.querySelector('.column-count').textContent = subset.length;
    if (!subset.length) holder.append(text('p', 'Пока нет задач', 'empty'));
    for (const task of subset) {
      const card = text('button', '', 'card'); card.type = 'button'; card.draggable = true;
      card.setAttribute('aria-label', `Открыть задачу: ${task.title}`);
      card.append(text('span', priorities[task.priority], `priority ${task.priority}`), text('h3', task.title));
      const meta = text('div', '', 'card-meta');
      const dateText = task.due ? new Date(`${task.due}T12:00:00`).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}) : (task.sprint ? 'В спринте' : 'Вне спринта');
      const late = task.due && task.due < new Date().toLocaleDateString('sv-SE') && task.status !== 'done';
      meta.append(text('span', (late ? 'Просрочено: ' : '') + dateText, late ? 'late' : ''), text('span', `${task.points} б.`, 'points'));
      card.append(meta); card.addEventListener('click', () => openTask(task));
      card.addEventListener('dragstart', event => { dragging = task.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', task.id); });
      card.addEventListener('dragend', () => { dragging = null; for (const c of document.querySelectorAll('.column')) c.classList.remove('dragover'); });
      holder.append(card);
    }
  }
}
function openTask(task = null) {
  editing = task?.id || null; form.reset();
  $('#editor-title').textContent = task ? 'Редактировать задачу' : 'Новая задача';
  $('#delete').hidden = !task; $('#form-error').textContent = '';
  if (task) for (const key of ['title','note','priority','points','status','due','sprint']) {
    const input = form.elements.namedItem(key); if (key === 'sprint') input.checked = task[key]; else input.value = task[key] ?? '';
  }
  editor.showModal(); form.elements.namedItem('title').focus();
}
$('#add').addEventListener('click', () => openTask());
for (const selector of ['.close','.cancel']) $(selector).addEventListener('click', () => editor.close());
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(form)); data.sprint = form.elements.namedItem('sprint').checked;
    if (editing) data.id = editing;
    const task = validateTask(data);
    const next = editing ? tasks.map(item => item.id === editing ? task : item) : [...tasks, task];
    if (persist(next, editing ? 'Изменения сохранены' : 'Задача добавлена')) editor.close();
  } catch (error) { $('#form-error').textContent = error.message; }
});
$('#delete').addEventListener('click', () => {
  if (confirm('Удалить эту задачу?')) if (persist(tasks.filter(task => task.id !== editing),'Задача удалена')) editor.close();
});
for (const button of document.querySelectorAll('.nav')) button.addEventListener('click', () => {
  view = button.dataset.view;
  for (const b of document.querySelectorAll('.nav')) b.classList.toggle('active', b === button);
  $('#view-title').textContent = view === 'all' ? 'Все задачи' : 'Текущий спринт'; render();
});
$('#search').addEventListener('input', render); $('#priority-filter').addEventListener('change', render);
for (const column of document.querySelectorAll('.column')) {
  column.addEventListener('dragover', event => { if (dragging) { event.preventDefault(); column.classList.add('dragover'); } });
  column.addEventListener('dragleave', event => { if (!column.contains(event.relatedTarget)) column.classList.remove('dragover'); });
  column.addEventListener('drop', event => {
    event.preventDefault(); column.classList.remove('dragover'); if (!dragging) return;
    persist(tasks.map(task => task.id === dragging ? { ...task, status: column.dataset.status } : task), `Задача перемещена: ${names[column.dataset.status]}`); dragging = null;
  });
}
$('#export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, tasks },null,2)], { type:'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'nedelya-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 Мбайт.');
    const imported = validateBackup(JSON.parse(await file.text()));
    if (confirm(`Заменить текущие задачи данными из файла? В файле ${imported.length} задач.`)) persist(imported, 'Резервная копия восстановлена');
  } catch (error) { toast(`Копия не загружена. ${error.message}`); } finally { event.target.value = ''; }
});
render();
