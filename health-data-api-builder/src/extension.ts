import * as vscode from 'vscode';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('healthDataApiBuilder.healthCheck', async (uri: vscode.Uri) => {
		const url = await vscode.window.showInputBox({
			prompt: 'Enter the base URL of the running DAB service',
			value: 'https://localhost:5001/health'
		});
		if (!url) { return; }

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Retrieving DAB Health Check...",
			cancellable: false
		}, async () => {
			try {
				const res = await fetch(`${url}`);
				const json = await res.json();
				showHealthWebView(json, url);
			} catch (err) {
				vscode.window.showErrorMessage(`❌ Unable to fetch from ${url}`);
			}
		});

	});

	context.subscriptions.push(disposable);
}

type HealthCheck = {
	status: string;
	name: string;
	tags: string[];
	exception?: string;
	data?: {
		['response-ms']?: number;
		['threshold-ms']?: number;
	};
};

function showHealthWebView(data: any, url: string) {
	const panel = vscode.window.createWebviewPanel(
		`dabHealth-${Date.now()}`,
		'DAB Health Report',
		vscode.ViewColumn.One,
		{}
	);

	const checks = Array.isArray(data.checks) ? data.checks : [];

	// Group checks by tag, excluding "endpoint"
	const groups: Record<string, typeof checks> = {};
	for (const check of checks) {
		for (const tag of check.tags) {
			if (tag.toLowerCase() === 'endpoint') continue;
			if (!groups[tag]) groups[tag] = [];
			groups[tag].push(check);
		}
	}

	const sections = Object.entries(groups).map(([tag, checks]) => `
		<h3>${tag.toUpperCase()}</h3>
		<div class="group">
			${checks.map((c: HealthCheck) => `
				<div class="card ${c.status.toLowerCase()}">
					<div class="top">
						<span class="status">${c.status === 'Healthy' ? '✅' : '❌'}</span>
						<span class="name">${c.name}</span>
					</div>
					<div class="meta">
						<span>${c.data?.['response-ms'] ?? '-'}ms / ${c.data?.['threshold-ms'] ?? '-'}ms</span>
					</div>
					${c.exception ? `<div class="exception">${c.exception}</div>` : ''}
				</div>
			`).join('')}
		</div>
	`).join('');

	panel.webview.html = `
		<html>
			<head>
				<style>
					body {
						font-family: sans-serif;
						padding: 16px;
					}
					.group {
						display: flex;
						flex-wrap: wrap;
						gap: 12px;
						margin-bottom: 24px;
					}
					.card {
						border: 1px solid #ccc;
						border-left: 6px solid transparent;
						padding: 12px;
						width: 280px;
						background: #f9f9f9;
						display: flex;
						flex-direction: column;
						gap: 4px;
					}
					.card.healthy {
						border-left-color: green;
					}
					.card.unhealthy {
						border-left-color: red;
						background: #fff5f5;
					}
					.card .top {
						display: flex;
						justify-content: space-between;
						font-weight: bold;
					}
					.card .meta {
						font-size: 0.9em;
						color: #555;
					}
					.card .exception {
						font-size: 0.85em;
						color: #a00;
						background: #fee;
						padding: 4px;
						border-radius: 3px;
						white-space: pre-wrap;
					}
					h2, h3 {
						margin-bottom: 8px;
					}
				</style>
			</head>
			<body>
				<h2>Status: ${data.status === 'Healthy' ? '✅' : '❌'} ${data.status}</h2>
				<p><small>Source: <code>${url}</code></small></p>
				${sections}
			</body>
		</html>
	`;
}

export function deactivate() { }
