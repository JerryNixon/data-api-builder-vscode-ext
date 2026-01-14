# Mandatory Testing Workflow

**CRITICAL**: This workflow MUST be followed for ALL code changes, no exceptions.

## After Every Code Change

### 1. Run Shared Package Tests
```bash
cd shared
npm test
```
**Result**: All tests must pass. If any fail, fix them before proceeding.

### 2. Build the Modified Extension
```bash
cd <extension-folder>  # e.g., add-data-api-builder
npm run compile
```
**Result**: Build must succeed with no errors. Fix TypeScript/ESLint errors before proceeding.

### 3. Run Extension Tests
```bash
npm test
```
**Result**: All tests must pass. If any fail, fix them before proceeding.

### 4. Update Tests When Needed
When you modify functionality:
- **Add new tests** for new features
- **Update existing tests** that are affected by changes
- **Increase test coverage** for shared packages
- **Test error conditions** and edge cases

### 5. Iterate Until Success
- If tests fail, diagnose and fix
- If build fails, resolve TypeScript/linting issues
- If tests need updating, update them
- **Do NOT** consider a task complete until all tests pass

## Workflow Checklist

For each task:
- [ ] Make code changes
- [ ] Run `shared/` tests → Fix failures
- [ ] Run `shared-database/` tests (if relevant) → Fix failures
- [ ] Build extension → Fix compilation errors
- [ ] Run extension tests → Fix failures
- [ ] Update tests (if behavior changed)
- [ ] Run linting → Fix warnings
- [ ] Verify all tests pass one final time

## Common Test Commands

### Shared Package
```bash
cd shared
npm run build   # Build TypeScript
npm test        # Run all tests
```

### Shared Database Package
```bash
cd shared-database
npm run build
npm test
```

### Extension
```bash
cd <extension-name>
npm run compile    # Build
npm run lint       # Check code quality
npm test          # Run tests
```

## When Tests Fail

1. **Read the error message carefully**
2. **Identify what changed** that caused the failure
3. **Update tests** if behavior intentionally changed
4. **Fix the code** if behavior unintentionally broke
5. **Run tests again** to verify the fix
6. **Repeat** until all tests pass

## Never Skip Testing

- Tests are not optional
- Tests catch regressions
- Tests document expected behavior
- Tests ensure quality

**If you're not testing, you're not done.**
