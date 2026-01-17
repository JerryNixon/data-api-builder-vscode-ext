import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import { readConfig } from 'dab-vscode-shared';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('healthDataApiBuilder.healthCheck', async (uri: vscode.Uri) => {
		showHealthWebView(uri);
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}

async function fetchHealthData(url: string): Promise<{ success: boolean; data?: any; error?: string }> {
	return new Promise((resolve) => {
		try {
			const urlObj = new URL(url);
			const client = urlObj.protocol === 'https:' ? https : http;
			
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port,
				path: urlObj.pathname,
				method: 'GET',
				rejectUnauthorized: false
			};

			const req = client.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => data += chunk);
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 400) {
						resolve({ success: false, error: `HTTP ${res.statusCode}: ${http.STATUS_CODES[res.statusCode] || 'Error'}` });
						return;
					}
					try {
						const json = JSON.parse(data);
						resolve({ success: true, data: json });
					} catch (err) {
						resolve({ success: false, error: `Invalid JSON response: ${err instanceof Error ? err.message : 'Parse error'}` });
					}
				});
			});

			req.on('error', (err) => {
				const errorMsg = err.message || 'Connection failed';
				resolve({ success: false, error: `Connection error: ${errorMsg}` });
			});

			req.setTimeout(5000, () => {
				req.destroy();
				resolve({ success: false, error: 'Request timeout (5 seconds). DAB may not be running on this port.' });
			});

			req.end();
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			resolve({ success: false, error: `Failed to connect: ${errorMsg}` });
		}
	});
}

function getDefaultUrlsFromConfig(uri?: vscode.Uri): string[] {
	const defaultUrls = [
		'http://localhost:5000/health',
		'https://localhost:5001/health'
	];

	if (!uri) {
		return defaultUrls;
	}

	try {
		const configPath = uri.fsPath;
		const config = readConfig(configPath);
		
		if (!config) {
			return defaultUrls;
		}

		// Try to detect URLs from config (DAB doesn't store port in config, but we can note if HTTPS is configured)
		const urls: string[] = [];
		
		// Check common development ports
		urls.push('http://localhost:5000/health');
		urls.push('https://localhost:5001/health');
		
		// Add some other common ports
		urls.push('http://localhost:5050/health');
		urls.push('http://localhost:8080/health');
		
		return urls;
	} catch {
		return defaultUrls;
	}
}

function showHealthWebView(uri?: vscode.Uri) {
	const urls = getDefaultUrlsFromConfig(uri);
	
	const panel = vscode.window.createWebviewPanel(
		`dabHealth-${Date.now()}`,
		'DAB Health Report',
		vscode.ViewColumn.One,
		{ enableScripts: true }
	);

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(async (message) => {
		if (message.command === 'fetch') {
			const result = await fetchHealthData(message.url);
			panel.webview.postMessage({ command: 'healthData', ...result });
		}
	});

	panel.webview.html = `
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
				<style>
					#sourceControl {
						margin-bottom: 0.25rem;
						gap: 0.5rem;
						flex-wrap: nowrap;
					}
					#sourceControl select,
					#sourceControl input {
						min-width: 280px;
						max-width: 100%;
						font-size: 0.875rem;
						padding: 0.25rem;
						height: auto;
					}
					#refreshBtn {
						white-space: nowrap;
						flex-shrink: 0;
					}
					#statusMsg {
						font-size: 0.8rem;
						color: red;
						margin-top: 0.25rem;
					}
					.card-text {
						white-space: nowrap;
					}
				</style>
			</head>
			<body class="p-4">
				<div class="container">
					<div id="sourceControl" class="d-flex align-items-center">
						<div class="input-group input-group-sm flex-grow-1">
							<select id="urlSelect" class="form-select">
								${urls.map((url, i) => `<option value="${url}"${i === 0 ? ' selected' : ''}>${url}</option>`).join('')}
								<option value="custom">Custom...</option>
							</select>
							<input type="text" id="customUrl" class="form-control d-none" placeholder="Enter custom URL" />
						</div>
						<button id="refreshBtn" class="btn btn-sm btn-primary ms-2">Refresh</button>
					</div>
					<div id="statusMsg"></div>
					<div id="reportArea"></div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					let currentUrl = "http://localhost:5000/health";

					document.getElementById('urlSelect').addEventListener('change', (e) => {
						const val = e.target.value;
						const customInput = document.getElementById('customUrl');
						if (val === 'custom') {
							customInput.classList.remove('d-none');
							customInput.focus();
						} else {
							customInput.classList.add('d-none');
							currentUrl = val;
						}
					});

					document.getElementById('customUrl').addEventListener('input', (e) => {
						currentUrl = e.target.value;
					});

					document.getElementById('refreshBtn').addEventListener('click', () => {
						fetchAndRender(currentUrl);
					});

					// Listen for messages from the extension
					window.addEventListener('message', event => {
						const message = event.data;
						if (message.command === 'healthData') {
							const statusMsg = document.getElementById('statusMsg');
							if (message.success) {
								renderReport(message.data, currentUrl);
								statusMsg.textContent = '';
							} else {
								document.getElementById('reportArea').innerHTML = '';
								statusMsg.textContent = '❌ Error: ' + message.error;
							}
						}
					});

					function fetchAndRender(url) {
						const statusMsg = document.getElementById('statusMsg');
						statusMsg.textContent = 'Loading...';
						vscode.postMessage({ command: 'fetch', url: url });
					}

					function renderReport(data, url) {
						const checks = Array.isArray(data.checks) ? data.checks : [];
						const groups = {};
						for (const check of checks) {
							for (const tag of check.tags || []) {
								if (tag.toLowerCase() === 'endpoint') continue;
								if (!groups[tag]) groups[tag] = [];
								groups[tag].push(check);
							}
						}

						const sections = Object.entries(groups).map(([tag, checks]) => \`
							<h3>\${tag.toUpperCase()}</h3>
							<div class="row">
								\${checks.map(c => \`
									<div class="col-md-4">
										<div class="card border-\${c.status === 'Healthy' ? 'success' : 'danger'} mb-3">
											<div class="card-header d-flex justify-content-between">
												<span>\${c.name}</span>
												<span>\${c.status === 'Healthy' ? '✅' : '❌'}</span>
											</div>
											<div class="card-body">
												<p class="card-text">\${c.data?.['response-ms'] ?? '-'}ms / \${c.data?.['threshold-ms'] ?? '-'}ms</p>
												\${c.exception ? \`<div class="alert alert-danger" role="alert">\${c.exception}</div>\` : ''}
											</div>
										</div>
									</div>
								\`).join('')}
							</div>
						\`).join('');

						const configurationSection = data.configuration ? \`
							<h3>Configuration</h3>
							<table class="table table-bordered">
								<thead class="table-light">
									<tr><th>Key</th><th>Value</th></tr>
								</thead>
								<tbody>
									\${Object.entries(data.configuration).map(([key, value]) => \`
										<tr><td>\${key}</td><td>\${value === true ? '✅ true' : value === false ? '❌ false' : value}</td></tr>
									\`).join('')}
								</tbody>
							</table>
						\` : '';

						const dateStr = new Date().toLocaleString();
						const infoSection = \`
							<ul class="list-group mb-4">
								<li class="list-group-item"><strong>App Name:</strong> \${data['app-name']}</li>
								<li class="list-group-item"><strong>Version:</strong> \${data.version}</li>
								<li class="list-group-item"><strong>Checked:</strong> \${dateStr}</li>
								<li class="list-group-item"><strong>Source:</strong> <a href="\${url}" target="_blank">\${url}</a></li>
							</ul>
						\`;

						document.getElementById('reportArea').innerHTML = \`
							<h2>Status: \${data.status === 'Healthy' ? '✅' : '❌'} \${data.status}</h2>
							\${infoSection}
							\${configurationSection}
							\${sections}
						\`;
					}

					fetchAndRender(currentUrl);
				</script>
			</body>
		</html>
	`;
}
