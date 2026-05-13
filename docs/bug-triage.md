# Bug Triage Process

1. **Capture**: open a bug report with environment, reproduction steps, expected behavior, actual behavior, and severity.
2. **Classify**: label as `critical`, `major`, or `minor` based on business impact and user flow.
3. **Reproduce**: add a failing automated test when possible.
4. **Fix**: update the code, then run targeted tests and regression coverage.
5. **Verify**: confirm the bug is resolved in local environment and by running the full affected flow.
6. **Document**: add notes to `CHANGELOG.md` and update issue status.
