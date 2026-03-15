import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildConfigCommand, buildInitCommand, resolveConfigPath, waitForFile } from '../utils';

suite('Init utils', () => {
	test('resolveConfigPath increments suffix when file exists', () => {
		const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dab-init-'));
		const firstPath = path.join(temp, 'dab-config.json');
		const secondPath = path.join(temp, 'dab-config-2.json');
		fs.writeFileSync(firstPath, '{}');
		fs.writeFileSync(secondPath, '{}');

		const resolved = resolveConfigPath(temp);

		assert.strictEqual(path.basename(resolved), 'dab-config-3.json');
		fs.rmSync(temp, { recursive: true, force: true });
	});

	test('buildInitCommand formats with hardcoded defaults', () => {
		const command = buildInitCommand('/project/dab-config.json', 'MSSQL_CONNECTION_STRING', '/project');

		assert.ok(command.includes('dab init'));
		assert.ok(command.includes("--connection-string \"@env('MSSQL_CONNECTION_STRING')\""));
		assert.ok(command.includes('--host-mode Development'));
		assert.ok(command.includes('--rest.enabled true'));
		assert.ok(command.includes('--graphql.enabled true'));
		assert.ok(command.includes('--mcp.enabled true'));
		assert.ok(command.includes('--auth.provider Unauthenticated'));
		assert.ok(command.includes('-c "dab-config.json"'));
	});

	test('buildConfigCommand targets basename', () => {
		const cmd = buildConfigCommand('/project/sub/dab-config-2.json', 'runtime.rest.request-body-strict', 'false', '/project/sub');
		assert.ok(cmd.includes('dab configure'));
		assert.ok(cmd.includes('-c "dab-config-2.json"'));
	});

	test('waitForFile resolves when file appears', async () => {
		const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dab-wait-'));
		const target = path.join(temp, 'dab-config.json');

		const waitPromise = waitForFile(target, 500, 25);
		setTimeout(() => fs.writeFileSync(target, '{}'), 50);

		await waitPromise;
		fs.rmSync(temp, { recursive: true, force: true });
	});

	test('waitForFile rejects when timeout exceeded', async () => {
		const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dab-wait-timeout-'));
		const target = path.join(temp, 'missing.json');

		await assert.rejects(() => waitForFile(target, 100, 25));
		fs.rmSync(temp, { recursive: true, force: true });
	});
});
