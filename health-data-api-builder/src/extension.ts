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
		<div class="row">
			${checks.map((c: HealthCheck) => `
				<div class="col-md-4">
					<div class="card border-${c.status === 'Healthy' ? 'success' : 'danger'} mb-3">
						<div class="card-header d-flex justify-content-between">
							<span>${c.name}</span>
							<span>${c.status === 'Healthy' ? '✅' : '❌'}</span>
						</div>
						<div class="card-body">
							<p class="card-text">${c.data?.['response-ms'] ?? '-'}ms / ${c.data?.['threshold-ms'] ?? '-'}ms</p>
							${c.exception ? `<div class="alert alert-danger" role="alert">${c.exception}</div>` : ''}
						</div>
					</div>
				</div>
			`).join('')}
		</div>
	`).join('');

	const configurationSection = data.configuration ? `
		<h3>Configuration</h3>
		<table class="table table-bordered">
			<thead class="table-light">
				<tr><th>Key</th><th>Value</th></tr>
			</thead>
			<tbody>
				${Object.entries(data.configuration).map(([key, value]) => `
					<tr><td>${key}</td><td>${value === true ? '✅ true' : value === false ? '❌ false' : value}</td></tr>
				`).join('')}
			</tbody>
		</table>
	` : '';

	const dateStr = new Date().toLocaleString();
	const infoSection = `
		<ul class="list-group mb-4">
			<li class="list-group-item"><strong>App Name:</strong> ${data['app-name']}</li>
			<li class="list-group-item"><strong>Version:</strong> ${data.version}</li>
			<li class="list-group-item"><strong>Checked:</strong> ${dateStr}</li>
			<li class="list-group-item"><strong>Source:</strong> <a href="${url}" target="_blank">${url}</a></li>
		</ul>
	`;

	panel.webview.html = `
		<html>
			<head>
				<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
			</head>
			<body class="p-4">
				<div class="container">
					<h2>Status: ${data.status === 'Healthy' ? '✅' : '❌'} ${data.status}</h2>
					${infoSection}
					${configurationSection}
					${sections}
				</div>
			</body>
		</html>
	`;
}

export function deactivate() { }
