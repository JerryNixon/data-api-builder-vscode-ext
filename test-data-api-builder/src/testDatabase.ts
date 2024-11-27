import * as vscode from 'vscode';

export async function testDatabaseConnection(dbType: string, connectionString: string) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Testing connection for ${dbType}...`,
            cancellable: false,
        },
        async (progress) => {
            progress.report({ message: 'Establishing connection...' });

            try {
                switch (dbType) {
                    case 'mssql':
                        await withTimeout(testMssqlConnection(connectionString), 30000);
                        break;
                    case 'mysql':
                        await withTimeout(testMysqlConnection(connectionString), 30000);
                        break;
                    case 'postgresql':
                        await withTimeout(testPostgresqlConnection(connectionString), 30000);
                        break;
                    case 'cosmosdb_nosql':
                        await withTimeout(testCosmosDbConnection(connectionString), 30000);
                        break;
                    default:
                        throw new Error(`Unsupported database type: ${dbType}`);
                }

                vscode.window.showInformationMessage(`Connection to ${dbType} was successful!`);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to connect to ${dbType}: ${(error as Error).message}`
                );
            }
        }
    );
}

// Method to test SQL Server connection
async function testMssqlConnection(connectionString: string) {
    const sql = require('mssql');

    // Check if the connection string references LocalDB
    if (connectionString.includes('(localdb)')) {
        vscode.window.showErrorMessage(
            'The connection string references LocalDB `(localdb)`, which is not supported by this extension.'
        );
        return;
    }

    try {
        const pool = await sql.connect(connectionString);
        await pool.close();
        vscode.window.showInformationMessage('Successfully connected to SQL Server.');
    } catch (error) {
        throw new Error(`Failed to connect to SQL Server: ${(error as Error).message}`);
    }
}

// Method to test MySQL connection
async function testMysqlConnection(connectionString: string) {
    const mysql = require('mysql2/promise');
    const mysqlConnection = await mysql.createConnection(connectionString);
    await mysqlConnection.end();
}

// Method to test PostgreSQL connection
async function testPostgresqlConnection(connectionString: string) {
    const { Client } = require('pg');
    const pgClient = new Client({ connectionString });
    await pgClient.connect();
    await pgClient.end();
}

// Method to test Azure Cosmos DB connection
async function testCosmosDbConnection(connectionString: string) {
    const { CosmosClient } = require('@azure/cosmos');
    const client = new CosmosClient(connectionString);
    await client.getDatabaseAccount();
}

// Utility function for timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs} ms`)), timeoutMs)
        ),
    ]);
}
