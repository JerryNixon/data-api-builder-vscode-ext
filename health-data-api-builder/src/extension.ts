import * as vscode from 'vscode';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('healthDataApiBuilder.healthCheck', async (_uri: vscode.Uri) => {
		showHealthWebView();
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}

function showHealthWebView() {
	const panel = vscode.window.createWebviewPanel(
		`dabHealth-${Date.now()}`,
		'DAB Health Report',
		vscode.ViewColumn.One,
		{ enableScripts: true }
	);

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
								<option value="http://localhost:5000/health" selected>http://localhost:5000/health</option>
								<option value="https://localhost:5001/health">https://localhost:5001/health</option>
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

					async function fetchAndRender(url) {
						const statusMsg = document.getElementById('statusMsg');
						statusMsg.textContent = '';
						try {
							const res = await fetch(url);
							const text = await res.text();
							try {
								const json = JSON.parse(text);
								renderReport(json, url);
								statusMsg.textContent = '';
							} catch (jsonErr) {
								document.getElementById('reportArea').innerHTML = '';
								statusMsg.textContent = '❌ Invalid JSON: ' + jsonErr.message;
							}
						} catch (err) {
							document.getElementById('reportArea').innerHTML = '';
							statusMsg.textContent = '❌ Fetch error: ' + err.message;
						}
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
