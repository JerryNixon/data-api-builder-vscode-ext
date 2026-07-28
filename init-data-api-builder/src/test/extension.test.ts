import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runDabCommand } from '../dabRunner';
import { buildInitArgs, resolveConfigPath, waitForFile } from '../utils';

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

	test('buildInitArgs includes only required and intentional non-default settings', () => {
		const args = buildInitArgs('/project/dab-config.json', 'MSSQL_CONNECTION_STRING');

		assert.deepStrictEqual(args, [
			'init',
			'--database-type', 'mssql',
			'--connection-string', "@env('MSSQL_CONNECTION_STRING')",
			'--host-mode', 'Development',
			'--cors-origin', '*',
			'-c', 'dab-config.json'
		]);
		assert.ok(!args.some(arg => /^(--rest|--graphql|--mcp|--auth)/.test(arg)));
	});

	test('runDabCommand streams output and waits for success', async () => {
		let output = '';

		await runDabCommand(
			['-e', "process.stdout.write('complete')"],
			os.tmpdir(),
			text => output += text,
			'node'
		);

		assert.strictEqual(output, 'complete');
	});

	test('runDabCommand rejects a non-zero exit code', async () => {
		await assert.rejects(
			() => runDabCommand(['-e', 'process.exit(7)'], os.tmpdir(), () => {}, 'node'),
			/DAB CLI exited with code 7/
		);
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
