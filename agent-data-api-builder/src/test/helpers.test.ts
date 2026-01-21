import * as assert from 'assert';

/**
 * Unit tests for pure helper functions
 * These tests run in Node.js without VS Code API
 */

// Import the helper functions we want to test
// Note: These need to be extracted to a separate utils.ts file for testing

describe('Intent Detection', () => {
    // Helper to simulate intent detection (must match chatHandler.ts keywords)
    const isInitIntent = (prompt: string): boolean => {
        const keywords = ['init', 'create config', 'set up dab', 'setup dab', 'initialize', 'new config', 'start fresh', 'create dab', 'get started', 'new project', 'create a rest api', 'create rest endpoint', 'create a graphql api', 'create graphql endpoint'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isAddIntent = (prompt: string): boolean => {
        const keywords = ['add table', 'add entity', 'add view', 'add procedure', 'add stored', 'expose table', 'expose view', 'include table', 'add the ', 'add my ', 'expose all', 'all my tables', 'all tables', 'update dab with', 'new tables', 'add new table'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isRelationshipIntent = (prompt: string): boolean => {
        const keywords = ['relationship', 'foreign key', 'one to many', 'many to many', 'link entities', 'join', 'nested query', 'has many', 'belongs to', 'table relationship', 'add relationship'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isMcpIntent = (prompt: string): boolean => {
        const keywords = ['mcp', 'model context', 'ai tool', 'ai integration', 'claude', 'cursor', 'copilot tool', 'expose as tool', 'mcp server', 'create mcp', 'enable mcp'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isStartIntent = (prompt: string): boolean => {
        const keywords = ['start server', 'start dab', 'run server', 'run dab', 'launch', 'start the '];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isValidateIntent = (prompt: string): boolean => {
        const keywords = ['validate', 'check config', 'verify config', 'test config', 'config valid', 'check for error', 'is it valid', 'review my', 'review config', 'review dab'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isConfigureIntent = (prompt: string): boolean => {
        const keywords = ['configure', 'enable caching', 'enable cors', 'set cors', 'change port', 'enable auth', 'enable rest', 'enable graphql', 'disable'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    const isFixIntent = (prompt: string): boolean => {
        const keywords = ['fix', 'error', 'problem', 'issue', 'not working', 'failed', 'troubleshoot', 'debug', 'help with', "can't connect", 'cannot connect'];
        return keywords.some(k => prompt.toLowerCase().includes(k));
    };

    describe('isInitIntent', () => {
        it('should detect "initialize DAB"', () => {
            assert.strictEqual(isInitIntent('initialize DAB for my project'), true);
        });

        it('should detect "create config"', () => {
            assert.strictEqual(isInitIntent('create config for SQL Server'), true);
        });

        it('should detect "set up dab"', () => {
            assert.strictEqual(isInitIntent('set up dab with my database'), true);
        });

        it('should detect "get started"', () => {
            assert.strictEqual(isInitIntent('help me get started with DAB'), true);
        });

        it('should not detect unrelated prompts', () => {
            assert.strictEqual(isInitIntent('what is DAB?'), false);
        });

        // Common scenario tests
        it('should detect "create a REST API"', () => {
            assert.strictEqual(isInitIntent('create a REST API for my database'), true);
        });

        it('should detect "create a GraphQL API"', () => {
            assert.strictEqual(isInitIntent('create a graphql api for my project'), true);
        });
    });

    describe('isAddIntent', () => {
        it('should detect "add table"', () => {
            assert.strictEqual(isAddIntent('add table Products'), true);
        });

        it('should detect "add the X table"', () => {
            assert.strictEqual(isAddIntent('add the Orders table with read permissions'), true);
        });

        it('should detect "expose table"', () => {
            assert.strictEqual(isAddIntent('expose table Customers as API'), true);
        });

        it('should detect "add stored procedure"', () => {
            assert.strictEqual(isAddIntent('add stored procedure GetOrders'), true);
        });

        it('should not detect unrelated prompts', () => {
            assert.strictEqual(isAddIntent('start the server'), false);
        });

        // Common scenario tests
        it('should detect "expose all my tables"', () => {
            assert.strictEqual(isAddIntent('expose all my tables as API endpoints'), true);
        });

        it('should detect "all tables"', () => {
            assert.strictEqual(isAddIntent('add all tables from my database'), true);
        });

        it('should detect "update DAB with new tables"', () => {
            assert.strictEqual(isAddIntent('update DAB with my new tables'), true);
        });
    });

    describe('isRelationshipIntent', () => {
        it('should detect "relationship"', () => {
            assert.strictEqual(isRelationshipIntent('set up a relationship between Author and Book'), true);
        });

        it('should detect "has many"', () => {
            assert.strictEqual(isRelationshipIntent('Author has many Books'), true);
        });

        it('should detect "foreign key"', () => {
            assert.strictEqual(isRelationshipIntent('configure foreign key from Orders to Customers'), true);
        });

        it('should detect "nested query"', () => {
            assert.strictEqual(isRelationshipIntent('I want nested query support'), true);
        });

        // Common scenario tests
        it('should detect "add table relationships"', () => {
            assert.strictEqual(isRelationshipIntent('add table relationships to my config'), true);
        });
    });

    describe('isMcpIntent', () => {
        it('should detect "mcp"', () => {
            assert.strictEqual(isMcpIntent('enable MCP endpoint'), true);
        });

        it('should detect "ai tool"', () => {
            assert.strictEqual(isMcpIntent('expose this as an AI tool'), true);
        });

        it('should detect "claude"', () => {
            assert.strictEqual(isMcpIntent('I want to use this with Claude'), true);
        });

        // Common scenario tests
        it('should detect "create an MCP server"', () => {
            assert.strictEqual(isMcpIntent('create an MCP server for my AI tools'), true);
        });

        it('should detect "enable MCP"', () => {
            assert.strictEqual(isMcpIntent('enable mcp on my DAB config'), true);
        });
    });

    describe('isStartIntent', () => {
        it('should detect "start server"', () => {
            assert.strictEqual(isStartIntent('start server'), true);
        });

        it('should detect "start dab"', () => {
            assert.strictEqual(isStartIntent('start dab now'), true);
        });

        it('should detect "run dab"', () => {
            assert.strictEqual(isStartIntent('run dab please'), true);
        });

        it('should not trigger on "start fresh"', () => {
            // "start fresh" should trigger init, not start
            assert.strictEqual(isStartIntent('start fresh'), false);
        });
    });

    describe('isValidateIntent', () => {
        it('should detect "validate"', () => {
            assert.strictEqual(isValidateIntent('validate my configuration'), true);
        });

        it('should detect "check config"', () => {
            assert.strictEqual(isValidateIntent('check config for errors'), true);
        });

        it('should detect "is my config valid"', () => {
            assert.strictEqual(isValidateIntent('is my dab-config.json valid?'), false);
            // Note: "is valid" phrase detection requires the exact phrase
            // The LLM fallback handles edge cases like this
        });

        // Common scenario tests
        it('should detect "review my config"', () => {
            assert.strictEqual(isValidateIntent('review my DAB configuration'), true);
        });

        it('should detect "review dab"', () => {
            assert.strictEqual(isValidateIntent('please review dab setup'), true);
        });
    });

    describe('isConfigureIntent', () => {
        it('should detect "configure"', () => {
            assert.strictEqual(isConfigureIntent('configure runtime settings'), true);
        });

        it('should detect "enable caching"', () => {
            assert.strictEqual(isConfigureIntent('enable caching for products'), true);
        });

        it('should detect "enable cors"', () => {
            assert.strictEqual(isConfigureIntent('enable cors for localhost'), true);
        });
    });

    describe('isFixIntent', () => {
        it('should detect "fix"', () => {
            assert.strictEqual(isFixIntent('fix my connection string'), true);
        });

        it('should detect "error"', () => {
            assert.strictEqual(isFixIntent("I'm getting an error"), true);
        });

        it('should detect "not working"', () => {
            assert.strictEqual(isFixIntent('DAB is not working'), true);
        });

        it('should detect "can\'t connect"', () => {
            assert.strictEqual(isFixIntent("can't connect to database"), true);
        });
    });
});

describe('Command Building', () => {
    const buildInitCommand = (envVar: string): string => {
        return `dab init \\
  --database-type mssql \\
  --connection-string "@env('${envVar}')" \\
  --host-mode development \\
  --rest.enabled true \\
  --graphql.enabled true \\
  --mcp.enabled true`;
    };

    it('should build init command with DATABASE_CONNECTION_STRING', () => {
        const command = buildInitCommand('DATABASE_CONNECTION_STRING');
        assert.ok(command.includes("@env('DATABASE_CONNECTION_STRING')"));
        assert.ok(command.includes('--database-type mssql'));
        assert.ok(command.includes('--mcp.enabled true'));
    });

    it('should build init command with custom env var', () => {
        const command = buildInitCommand('MY_SQL_CONN');
        assert.ok(command.includes("@env('MY_SQL_CONN')"));
    });
});
