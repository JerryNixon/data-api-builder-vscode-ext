rmdir /s /q node_modules
del package-lock.json
rmdir /s /q dist
npm cache clean --force

npm install --force
npm update mssql

npx webpack

npm run build
vsce package
code --uninstall-extension jerry-nixon.add-data-api-builder
code --install-extension .\add-data-api-builder-0.0.12.vsix
