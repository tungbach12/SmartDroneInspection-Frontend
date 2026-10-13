# Task 3 Report — Workforce Credential Records and Review UI

## Scope delivered

- Added typed workforce credential response and request types, including the backend response identifier `id` and exact status vocabulary: `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `REJECTED`, `SUSPENDED`.
- Added API methods for `GET /workforce/credentials`, `POST /workforce/credentials`, and `PUT /workforce/credentials/{id}/review`.
- Credential create dates serialize as ISO-8601 instants. `evidenceId` is an optional raw reference only. Organization scope is not included in requests.
- Added TanStack Query hooks and workforce query keys. Create invalidates credentials; review invalidates credentials and workforce users.
- Added the Credentials tab to the Workforce page, with create and internal review dialogs. The user selector uses the existing workforce list. Expiry is presented as a reminder; the UI explicitly states that statuses are recorded internally and do not imply government/external verification. No evidence upload or picker was introduced.
- Preserved Task 2's temporary-password callback/cache isolation behavior unchanged.

## Tests added

- API contract tests cover list/create/review endpoints, ISO date serialization, optional evidence reference, no organization scope, and response mapping through `id`.
- Hook tests cover credential query key, invalidation of credential and user lists after review, and preserving create errors.
- Page tests cover same-organization workforce user selection, optional evidence reference, issue/expiry order feedback, distinct expiry/rejection/suspension statuses, internal approve/reject reason, and absence of external verification claims.

## Verification

Commands run in the designated worktree `D:\CTP\SmartDroneInspection-Frontend\.claude\worktrees\mf1-fe-task3`:

- `npm --prefix 'D:/CTP/SmartDroneInspection-Frontend/.claude/worktrees/mf1-fe-task3' test -- --run src/features/workforce/api/workforceApi.test.ts src/features/workforce/hooks/useWorkforce.test.tsx src/features/workforce/pages/WorkforcePage.test.tsx` — **passed**, 3 files / 49 tests.
- `npm --prefix 'D:/CTP/SmartDroneInspection-Frontend/.claude/worktrees/mf1-fe-task3' run build` — **passed** (TypeScript and Vite production build).
- `npm --prefix 'D:/CTP/SmartDroneInspection-Frontend/.claude/worktrees/mf1-fe-task3' run lint` — **exit 0**, four pre-existing Fast Refresh warnings in `src/main.tsx`, `src/app/router/router.tsx`, and `src/shared/ui/Toast.tsx`; no Task 3 warnings.
- `npm --prefix 'D:/CTP/SmartDroneInspection-Frontend/.claude/worktrees/mf1-fe-task3' test -- --maxWorkers=1` — **passed**, 38 files / 249 tests.
- `git -C 'D:/CTP/SmartDroneInspection-Frontend/.claude/worktrees/mf1-fe-task3' diff --check` — **passed**.

## Documentation impact

No product/SRS documentation was changed. This task implements the already-approved MF1 Task 3 UI/API client plan against the existing backend contract; it introduces no backend, requirement, authorization, or data-model changes. Report 5 supporting verification documentation is owned by the documentation repository/task and was not modified here.

## Concerns

- The frontend test suite required serial execution for a stable full-suite run. A default parallel run exceeded timeouts in unrelated existing Assets, Reports, Login, and Inspections tests. Serial run passed 249/249.
- Lint exits successfully with the four existing warnings listed above.
- Backend response `organizationId` is modeled because it is returned, but it is never sent in request payloads.
