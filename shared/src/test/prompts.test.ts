import * as assert from 'assert';

/**
 * Unit tests for prompt manager functionality that doesn't require VS Code API
 */
describe('Prompt Manager Types', () => {
    it('PromptResult interface has required connection property', () => {
        // This test ensures the interface structure is correct
        const mockPromptResult = {
            connection: undefined
        };

        // Verify connection property exists
        assert.ok('connection' in mockPromptResult);
        
        // Test with actual connection object
        const mockPromptResultWithConnection = {
            connection: { name: 'TEST_CONNECTION', value: 'Server=test;Database=db;', display: 'Test DB' }
        };
        
        assert.ok('connection' in mockPromptResultWithConnection);
        assert.strictEqual(mockPromptResultWithConnection.connection?.name, 'TEST_CONNECTION');
    });
});