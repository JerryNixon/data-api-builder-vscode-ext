import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildConfigCommand, buildInitCommand, resolveConfigPath, waitForFile } from '../utils';
import type { PromptResult } from 'dab-vscode-shared';

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

	test('buildInitCommand formats host mode and env variable', () => {
		const prompt: PromptResult = {
			connection: { name: 'MSSQL_CONNECTION_STRING', value: 'Server=.;Database=db;' },
			enableRest: true,
			enableGraphQL: false,
			enableCache: true,
			hostMode: 'development',
			security: 'StaticWebApps'
		};

		const command = buildInitCommand('/project/dab-config.json', 'MSSQL_CONNECTION_STRING', prompt);

		assert.ok(command.includes("--connection-string \"@env('MSSQL_CONNECTION_STRING')\""));
		assert.ok(command.includes('--host-mode Development'));
		assert.ok(command.includes('--rest.enabled true'));
		assert.ok(command.includes('--graphql.enabled false'));
		assert.ok(command.endsWith('-c "dab-config.json"'));
	});

	test('buildConfigCommand targets basename', () => {
		const cmd = buildConfigCommand('/project/sub/dab-config-2.json', 'runtime.rest.request-body-strict', 'false');
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
