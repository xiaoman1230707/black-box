import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const apiImage = process.env.API_IMAGE;
const postgresImage = process.env.POSTGRES_IMAGE;
const runs = Number(process.env.API_SHUTDOWN_RUNS || '2');

const sleep = (milliseconds) => {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(4)),
    0,
    0,
    milliseconds,
  );
};

const docker = (args, { allowFailure = false } = {}) => {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `docker ${args[0]} failed: ${(result.stderr || '').trim()}`,
    );
  }
  return result;
};

const inspect = (name) =>
  JSON.parse(docker(['inspect', name]).stdout)[0];

const waitForHealth = (name, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = inspect(name).State;
    if (state.Health?.Status === 'healthy') return;
    if (state.Status === 'exited' || state.Status === 'dead') {
      throw new Error(`${name} exited before becoming healthy`);
    }
    sleep(1_000);
  }
  throw new Error(`${name} did not become healthy within ${timeoutMs}ms`);
};

const probeApi = (network, target, shouldSucceed) => {
  const result = docker(
    [
      'run',
      '--rm',
      '--network',
      network,
      '--entrypoint',
      'node',
      apiImage,
      '-e',
      `fetch('http://${target}:3000/api',{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)process.exit(2)}).catch(()=>process.exit(3))`,
    ],
    { allowFailure: true },
  );
  assert.equal(
    result.status === 0,
    shouldSucceed,
    shouldSucceed
      ? 'API was not reachable before SIGTERM'
      : 'API remained reachable after shutdown',
  );
};

const readContainerEvents = (containerId, sinceSeconds) => {
  const untilSeconds = Math.floor(Date.now() / 1000) + 1;
  const result = docker([
    'events',
    '--since',
    String(sinceSeconds),
    '--until',
    String(untilSeconds),
    '--filter',
    `container=${containerId}`,
    '--format',
    '{{json .}}',
  ]);

  return result.stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((event) => ({
      action: event.Action,
      signal: event.Actor?.Attributes?.signal,
    }));
};

test(
  'API exits cleanly after SIGTERM and leaves PostgreSQL healthy',
  { timeout: 180_000 },
  () => {
    assert.match(apiImage || '', /^black-box-api:[0-9a-f]{40}$/u);
    assert.match(postgresImage || '', /^postgres:[^@]+@sha256:[0-9a-f]{64}$/u);
    assert.ok(Number.isSafeInteger(runs) && runs > 0 && runs <= 2);

    const suffix = `${Date.now()}-${process.pid}`;
    const prefix = `bb-api-shutdown-${suffix}`;
    const network = `${prefix}-net`;
    const database = `${prefix}-db`;
    const fixtureRoot = mkdtempSync(join(tmpdir(), `${prefix}-`));
    const uploads = join(fixtureRoot, 'uploads');
    const databasePassword = randomBytes(24).toString('hex');
    const tokenSecret = randomBytes(48).toString('base64url');
    const createdContainers = [];
    mkdirSync(uploads);

    try {
      docker(['network', 'create', network]);
      docker([
        'run',
        '-d',
        '--name',
        database,
        '--network',
        network,
        '--network-alias',
        'db',
        '-e',
        'POSTGRES_USER=bb',
        '-e',
        `POSTGRES_PASSWORD=${databasePassword}`,
        '-e',
        'POSTGRES_DB=bb',
        '--health-cmd=pg_isready -U bb -d bb',
        '--health-interval=2s',
        '--health-timeout=2s',
        '--health-retries=20',
        postgresImage,
      ]);
      createdContainers.push(database);
      waitForHealth(database);

      for (let run = 1; run <= runs; run += 1) {
        const api = `${prefix}-api-${run}`;
        const result = docker([
          'run',
          '-d',
          '--name',
          api,
          '--network',
          network,
          '--network-alias',
          api,
          '--mount',
          `type=bind,src=${uploads},dst=/app/uploads`,
          '-e',
          'NODE_ENV=production',
          '-e',
          'PORT=3000',
          '-e',
          `DATABASE_URL=postgresql://bb:${databasePassword}@db:5432/bb`,
          '-e',
          `TOKEN_SECRET=${tokenSecret}`,
          '-e',
          'PUBLIC_BASE_URL=https://api.example.invalid',
          '-e',
          'FRONTEND_ORIGIN=https://app.example.invalid',
          '-e',
          'TRUST_PROXY=one-hop',
          '-e',
          'DEEPSEEK_API_KEY=invalid-lifecycle-key',
          '-e',
          'DEEPSEEK_BASE_URL=https://deepseek.example.invalid/v1',
          '-e',
          'DEEPSEEK_MODEL=deepseek-chat',
          '-e',
          'OPENAI_API_KEY=invalid-lifecycle-key',
          '-e',
          'OPENAI_BASE_URL=https://embedding.example.invalid/v1',
          '-e',
          'EMBEDDING_MODEL=text-embedding-3-small',
          apiImage,
        ]);
        createdContainers.push(api);
        const containerId = result.stdout.trim();
        waitForHealth(api);
        probeApi(network, api, true);

        const sinceSeconds = Math.floor(Date.now() / 1000) - 1;
        const startedAt = process.hrtime.bigint();
        docker(['stop', '--time', '10', api]);
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const state = inspect(api).State;
        const restartCount = inspect(api).RestartCount;
        const events = readContainerEvents(containerId, sinceSeconds);
        const signals = events
          .filter((event) => event.action === 'kill')
          .map((event) => event.signal);

        assert.ok(elapsedMs < 10_000, `shutdown took ${elapsedMs}ms`);
        assert.equal(state.ExitCode, 0);
        assert.equal(state.OOMKilled, false);
        assert.equal(restartCount, 0);
        assert.ok(signals.includes('15'), 'Docker did not record SIGTERM');
        assert.ok(!signals.includes('9'), 'Docker recorded SIGKILL');
        assert.equal(inspect(database).State.Health?.Status, 'healthy');
        probeApi(network, api, false);

        console.log(
          JSON.stringify({
            run,
            elapsedMs: Math.round(elapsedMs),
            exitCode: state.ExitCode,
            oomKilled: state.OOMKilled,
            restartCount,
            signals,
            databaseHealth: 'healthy',
            httpReachableAfterStop: false,
          }),
        );

        docker(['rm', api]);
        createdContainers.splice(createdContainers.indexOf(api), 1);
      }
    } finally {
      for (const container of createdContainers.reverse()) {
        docker(['rm', '-f', container], { allowFailure: true });
      }
      docker(['network', 'rm', network], { allowFailure: true });
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  },
);
