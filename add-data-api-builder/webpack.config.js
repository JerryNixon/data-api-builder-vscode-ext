const path = require('path');

module.exports = {
    target: 'node',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: "../[resource-path]" // ✅ Fixes breakpoint mapping
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    devtool: 'source-map', // ✅ Enables source map generation
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    externals: {
        vscode: 'commonjs vscode',
    },
};
