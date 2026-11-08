
const { spawn, spawnSync } = require('node:child_process');
const { join } = require('node:path');

const root = join(__dirname, '..');
const pgBin = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const pgData = join(process.env.LOCALAPPDATA, 'AutoGuide', 'postgres-data');
const pgLog = join(process.env.LOCALAPPDATA, 'AutoGuide', 'postgres-server.log');

const pgCtl = join(pgBin, 'pg_ctl.exe');
const pgReady = join(pgBin, 'pg_isready.exe');

const status = spawnSync(pgReady, ['-h', '127.0.0.1', '-p', '5432'], {
  stdio: 'ignore'
});

if (status.status !== 0) {
  console.log('Запускаем PostgreSQL...');

  const started = spawnSync(pgCtl, [
    '-D', pgData,
    '-l', pgLog,
    '-o', '-h 127.0.0.1 -p 5432',
    'start'
  ], { stdio: 'inherit' });

  if (started.status !== 0) {
    console.error('PostgreSQL не удалось запустить.');
    process.exit(1);
  }
}

console.log('PostgreSQL готов. Запускаем АвтоГид...');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [
  spawn(npm, ['run', 'dev'], {
    cwd: root,
    stdio: 'inherit',
    shell: true
  }),
  spawn(npm, ['run', 'dev'], {
    cwd: join(root, 'backend'),
    stdio: 'inherit',
    shell: true
  })
];

function stop() {
  for (const child of children) {
    if (child.pid && process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore'
      });
    } else if (child.pid) {
      child.kill();
    }
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
