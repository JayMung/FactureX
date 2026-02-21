# Code Review Checklist

Systematic checklist for conducting thorough code reviews covering functionality, security, performance, and maintainability. Use when reviewing pull requests, conducting code audits, or reviewing OpenClaw agent commits.

## Pre-Review

- [ ] Read the PR description and linked issues
- [ ] Understand what problem is being solved
- [ ] Check if tests pass in CI/CD
- [ ] Pull the branch and run it locally

## Functionality

- [ ] Code solves the stated problem
- [ ] All acceptance criteria are met
- [ ] Edge cases are handled
- [ ] Error cases are handled gracefully
- [ ] User input is validated
- [ ] No logical errors or off-by-one errors
- [ ] Loops terminate correctly
- [ ] State management is correct
- [ ] Failed operations are rolled back

## Security

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization is correct
- [ ] Sensitive data is protected
- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] No known vulnerable dependencies

## Performance

- [ ] No unnecessary database queries
- [ ] No N+1 query problems
- [ ] Efficient algorithms used
- [ ] No memory leaks
- [ ] Caching used appropriately
- [ ] React Query cache keys correct

## Code Quality

- [ ] Code is readable and clear
- [ ] Variable/function names are descriptive
- [ ] Functions are small and focused (single responsibility)
- [ ] No code duplication (DRY)
- [ ] Follows project conventions
- [ ] No dead code or commented-out code
- [ ] Magic numbers replaced with constants

## Tests

- [ ] New code has tests
- [ ] Tests cover edge cases
- [ ] Tests are meaningful (not just coverage)
- [ ] All tests pass
- [ ] Test coverage is adequate

## Documentation

- [ ] Code comments explain WHY, not WHAT
- [ ] API documentation updated if needed
- [ ] Breaking changes documented
- [ ] Migration guide provided if needed

## Git

- [ ] Commit messages are clear and follow conventions
- [ ] No merge conflicts
- [ ] Branch is up to date with dev
- [ ] No unnecessary files committed
- [ ] .gitignore properly configured

## Do NOT

- Approve without actually reading the code
- Be vague — provide specific feedback with examples
- Ignore security issues
- Skip test verification
- Rubber stamp reviews
