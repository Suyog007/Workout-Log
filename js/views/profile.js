// === Profile: program control, settings, backup, data ===

import {
  h, frag, card, button, statTile, icon, pill, sectionHeader, linkButton, toggle,
  segmented, numberField, textInput, field, sheet, closeSheet, confirmSheet, toast,
} from '../ui/components.js';
import * as M from '../core/model.js';
import * as store from '../core/store.js';
import * as sync from '../core/sync.js';
import * as timer from '../ui/timer.js';
import { go } from '../core/router.js';
import { applyTheme } from '../app-theme.js';
import { fmtDate, fmtInt, today, toISODate, startOfWeek } from '../core/util.js';

export const title = 'Profile';
export const tab = 'profile';

export function render() {
  const s = M.settings();
  const program = M.activeProgram();
  const root = h('div', { class: 'stack' });
  const teardown = [];

  root.appendChild(h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, 'Profile'));

  /* ---- Program ---- */
  root.appendChild(card(null,
    sectionHeader('Training block', program ? linkButton('Summary', () => go('/block'), 'arrowRight') : null),
    program
      ? frag(
          h('div', { class: 'stat-grid cols-2' },
            statTile('Block', program.name, `started ${fmtDate(program.startDate)}`),
            statTile('Week', `${Math.min(M.currentWeek(), program.weeks)} / ${program.weeks}`, M.isBlockComplete() ? 'complete' : 'in progress', {
              tone: M.isBlockComplete() ? 'good' : undefined,
            })
          ),
          h('div', { class: 'row wrap', style: { gap: '8px' } },
            linkButton('Change start date', () => startDateSheet(program), 'calendar'),
            linkButton('Edit program days', () => go('/library'), 'edit')
          )
        )
      : button('Start a 6-week block', { variant: 'primary', class: 'btn-block', onClick: async () => { await M.createProgram({}); toast('Block started', 'good'); } })
  ));

  /* ---- Logging preferences ---- */
  const stepGoal = numberField({
    value: s.stepGoal, step: 500, min: 1000, max: 50000,
    label: 'Daily step goal',
    onChange: (v) => M.saveSettings({ stepGoal: v || 10000 }),
  });

  root.appendChild(card(null,
    sectionHeader('Logging'),
    toggle('Track RIR', s.rirEnabled, (v) => M.saveSettings({ rirEnabled: v }), 'Reps in reserve, shown on the set you are working on'),
    s.rirEnabled
      ? field('Default RIR', segmented(
          [0, 1, 2, 3, 4].map((v) => ({ value: String(v), label: v === 4 ? '4+' : String(v) })),
          String(s.rirDefault),
          (v) => M.saveSettings({ rirDefault: Number(v) })
        ))
      : null,
    h('hr', { class: 'sep' }),
    toggle('Rest timer', s.restTimerEnabled, (v) => M.saveSettings({ restTimerEnabled: v }), 'Starts automatically after each set'),
    toggle('Alert when rest ends', s.restAlerts, async (v) => {
      if (v) {
        const granted = await timer.requestAlerts();
        if (!granted) {
          toast('Notifications were not allowed', 'danger');
          go('/profile');
          return;
        }
      }
      await M.saveSettings({ restAlerts: v });
    }, 'Sends a notification if the app is in the background'),
    h('hr', { class: 'sep' }),
    toggle('Pre-workout readiness check', s.readinessEnabled, (v) => M.saveSettings({ readinessEnabled: v }), 'Energy, soreness and sleep — recorded only, never changes the workout'),
    h('hr', { class: 'sep' }),
    field('Daily step goal', stepGoal),
    field('Waist unit', segmented(
      [{ value: 'cm', label: 'cm' }, { value: 'in', label: 'inches' }],
      s.waistUnit,
      (v) => M.saveSettings({ waistUnit: v })
    )),
    linkButton('Default cardio settings', () => cardioDefaultsSheet(), 'edit')
  ));

  /* ---- Appearance ---- */
  root.appendChild(card(null,
    sectionHeader('Appearance'),
    field('Theme', segmented(
      [{ value: 'system', label: 'System' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }],
      s.theme,
      async (v) => { await M.saveSettings({ theme: v }); applyTheme(v); }
    ))
  ));

  /* ---- Library ---- */
  root.appendChild(card({ class: 'flush' },
    h('div', { class: 'list' },
      h('button', { class: 'list-item', type: 'button', onClick: () => go('/library') },
        h('span', { class: 'list-badge' }, icon('book', 18)),
        h('span', { class: 'grow' },
          h('span', { class: 'list-title' }, 'Exercise library'),
          h('span', { class: 'list-sub' }, `${M.exercises().length} exercises · add, edit, swap`)
        ),
        icon('chevron', 16)
      ),
      h('button', { class: 'list-item', type: 'button', onClick: () => go('/metrics') },
        h('span', { class: 'list-badge' }, icon('scale', 18)),
        h('span', { class: 'grow' },
          h('span', { class: 'list-title' }, 'Body metrics'),
          h('span', { class: 'list-sub' }, 'Weight, waist and steps')
        ),
        icon('chevron', 16)
      )
    )
  ));

  /* ---- Cloud backup ---- */
  const backup = backupCard(s);
  if (backup.unmount) teardown.push(backup.unmount);
  root.appendChild(backup);

  /* ---- Data ---- */
  root.appendChild(card(null,
    sectionHeader('Data'),
    h('p', { class: 'small muted' },
      `${fmtInt(store.all('sessions').length)} workouts · ${fmtInt(store.all('setLogs').filter((x) => x.completed).length)} logged sets · ${fmtInt(store.all('bodyWeight').length)} weigh-ins`),
    h('div', { class: 'row wrap', style: { gap: '8px' } },
      button('Export backup', { variant: 'secondary', iconName: 'download', class: 'grow', onClick: exportBackup }),
      button('Import backup', { variant: 'secondary', iconName: 'upload', class: 'grow', onClick: importBackup })
    ),
    button('Erase all data on this device', {
      variant: 'danger', class: 'btn-block', iconName: 'trash',
      onClick: async () => {
        const ok = await confirmSheet({
          title: 'Erase everything?',
          body: 'Every workout, record and measurement stored on this device will be deleted. If cloud backup is on, the cloud copy is kept and you can restore from it.',
          confirmLabel: 'Erase everything',
        });
        if (!ok) return;
        await store.wipeLocal();
        await M.bootstrap();
        await M.createProgram({});
        toast('All local data erased');
        go('/home');
      },
    })
  ));

  root.appendChild(h('p', { class: 'xs dim', style: { textAlign: 'center', padding: '4px 0 10px' } },
    'Workout Log · offline-first PWA · data stored on this device'));

  root.unmount = () => teardown.forEach((fn) => fn());
  return root;
}

/* ---------------------------------------------------------------- backup */
function backupCard(settings) {
  const body = h('div', { class: 'stack' });
  const wrap = card(null, sectionHeader('Cloud backup'), body);

  const draw = (st) => {
    const children = [];
    children.push(toggle('Back up to the cloud', settings.syncEnabled, async (v) => {
      await M.saveSettings({ syncEnabled: v });
      if (v) await sync.connect();
      else {
        await sync.signOut();
        toast('Cloud backup off — local data untouched');
      }
      go('/profile');
    }, 'Keeps a copy so your history survives a lost or wiped phone'));

    if (!settings.syncEnabled) {
      children.push(h('p', { class: 'xs dim' }, 'Off. Everything works, but your history exists only on this device — export a backup now and then.'));
    } else if (st.status === 'signed-out' || st.status === 'connecting') {
      children.push(signInForm());
    } else if (st.status === 'error') {
      children.push(h('div', { class: 'banner' }, icon('cloud', 18), st.error || 'Sync error'));
      children.push(button('Retry', { variant: 'secondary', onClick: () => sync.sync({ pull: true }) }));
    } else {
      children.push(h('div', { class: 'kv' },
        h('span', { class: 'k' }, 'Account'),
        h('span', { class: 'v small' }, st.email || '—')
      ));
      if (st.uid) {
        children.push(h('div', { class: 'kv' },
          h('span', { class: 'k' }, 'User ID'),
          h('button', {
            class: 'link-btn', type: 'button',
            title: 'Copy — paste into firestore.rules to lock the project to this account',
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(st.uid);
                toast('User ID copied', 'good');
              } catch {
                toast(st.uid);
              }
            },
          }, `${st.uid.slice(0, 10)}…`, icon('download', 14))
        ));
      }
      children.push(h('div', { class: 'kv' },
        h('span', { class: 'k' }, 'Status'),
        h('span', { class: 'v' }, st.status === 'syncing' ? pill('Syncing…', 'accent') : st.pending ? pill(`${st.pending} to upload`, 'warn') : pill('Up to date', 'good'))
      ));
      children.push(h('div', { class: 'row wrap', style: { gap: '8px' } },
        button('Sync now', { variant: 'secondary', iconName: 'cloud', class: 'grow', onClick: () => sync.sync({ pull: true }) }),
        button('Restore from cloud', {
          variant: 'secondary', class: 'grow',
          onClick: async () => {
            const ok = await confirmSheet({
              title: 'Restore from cloud?',
              body: 'Pulls the full cloud copy onto this device. Anything newer here is kept — only older local records are overwritten.',
              confirmLabel: 'Restore', tone: 'primary',
            });
            if (!ok) return;
            try {
              const n = await sync.restoreFromCloud();
              toast(`Restored ${n} record${n === 1 ? '' : 's'}`, 'good');
            } catch (err) {
              toast(err.message, 'danger');
            }
          },
        })
      ));
      const reset = sync.cloudResetInfo();
      if (reset) {
        children.push(h('p', { class: 'xs dim' },
          `Database cleared on ${fmtDate(toISODate(new Date(reset.resetAt)))} \u2014 ${fmtInt(reset.removed)} old documents removed. Every set now writes straight to the cloud.`));
      }
      children.push(h('hr', { class: 'sep' }));
      children.push(button('Replace cloud copy with this device', {
        variant: 'secondary', class: 'btn-block', iconName: 'upload',
        onClick: async () => {
          const ok = await confirmSheet({
            title: 'Replace the cloud copy?',
            body: 'Erases everything this app has stored in the cloud, then uploads a fresh copy of what is on this device. Use this once, after clearing out the old data.',
            confirmLabel: 'Replace cloud copy',
          });
          if (!ok) return;
          try {
            const { removed, uploaded } = await sync.replaceCloudWithLocal();
            toast(`Cloud reset — ${removed} removed, ${uploaded} uploaded`, 'good');
          } catch (err) {
            toast(err.message, 'danger');
          }
        },
      }));
      children.push(linkButton('Sign out of backup', () => sync.signOut().then(() => go('/profile')), 'close'));
    }

    body.replaceChildren(...children.filter(Boolean));
  };

  draw(sync.state);
  const off = sync.onStatus(draw);
  wrap.unmount = off;
  return wrap;
}

function signInForm() {
  let email = '';
  let password = '';
  const emailInput = textInput({ placeholder: 'you@example.com', type: 'email', onChange: (v) => { email = v; }, label: 'Email' });
  const passInput = textInput({ placeholder: 'Password', type: 'password', onChange: (v) => { password = v; }, label: 'Password' });
  const firstRun = !sync.cloudResetInfo();
  const status = h('p', { class: 'xs dim' }, firstRun
    ? 'Signing in clears this account\u2019s database and uploads what is on this device. It happens once.'
    : 'Sign in to the account the backup belongs to.');

  const submit = async () => {
    email = emailInput.value.trim();
    password = passInput.value;
    if (!email || !password) { status.textContent = 'Enter an email and password.'; return; }
    status.textContent = 'Connecting…';
    try {
      await sync.signIn(email, password);
      toast('Cloud backup connected', 'good');
      go('/profile');
    } catch (err) {
      status.textContent = err.message || 'Could not sign in.';
    }
  };

  return h('div', { class: 'stack' },
    field('Email', emailInput),
    field('Password', passInput),
    button('Sign in', { variant: 'primary', class: 'btn-block', onClick: () => submit() }),
    status
  );
}

/* ------------------------------------------------------------------ data */
async function exportBackup() {
  const payload = await store.exportAll();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `workout-log-${today()}.json` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup file saved', 'good');
}

function importBackup() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const replace = await confirmSheet({
        title: 'Replace or merge?',
        body: 'Choose Replace to erase what is on this device first. Cancel merges the backup into your existing data instead.',
        confirmLabel: 'Replace',
      });
      const count = await store.importAll(payload, { replace });
      await M.bootstrap();
      toast(`Imported ${count} records`, 'good');
      go('/home');
    } catch (err) {
      toast(err.message || 'Could not read that file', 'danger');
    } finally {
      input.remove();
    }
  });
  document.body.appendChild(input);
  input.click();
}

/* ----------------------------------------------------------------- sheets */
function startDateSheet(program) {
  let value = program.startDate;
  const input = textInput({ value, type: 'date', onChange: (v) => { value = v || value; } });
  sheet('Block start date', h('div', { class: 'stack' },
    h('p', { class: 'sheet-text' }, 'Week 1 begins on the Monday of the week you pick. Changing this re-labels which week each workout belongs to.'),
    field('Start date', input)
  ), {
    footer: button('Save', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => {
        await M.setProgramStart(program.id, value);
        closeSheet();
        toast(`Week 1 starts ${fmtDate(startOfWeek(value))}`, 'good');
      },
    }),
  });
}

function cardioDefaultsSheet() {
  const d = M.settings().defaultCardio;
  let type = d.type;
  const duration = numberField({ value: d.durationMin, step: 5, min: 1, max: 180, label: 'Minutes' });
  const speed = numberField({ value: d.speed, step: 0.5, min: 0, max: 30, decimals: true, label: 'Speed' });
  const incline = numberField({ value: d.incline, step: 1, min: 0, max: 30, decimals: true, label: 'Incline' });

  sheet('Default cardio', h('div', { class: 'stack' },
    h('p', { class: 'sheet-text' }, 'Pre-filled whenever you log cardio after a workout.'),
    field('Type', segmented(
      ['Incline treadmill', 'Treadmill', 'Bike', 'Stairs'].map((v) => ({ value: v, label: v })),
      type, (v) => { type = v; }, { class: 'chips' }
    )),
    h('div', { class: 'stat-grid cols-2' },
      field('Minutes', duration),
      field('Speed', speed),
      field('Incline %', incline)
    )
  ), {
    footer: button('Save', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => {
        await M.saveSettings({
          defaultCardio: { type, durationMin: duration.read() || 20, speed: speed.read(), incline: incline.read() },
        });
        closeSheet();
        toast('Cardio defaults saved', 'good');
      },
    }),
  });
}
