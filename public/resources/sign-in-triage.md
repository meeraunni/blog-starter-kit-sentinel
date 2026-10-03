# Sign-in triage worksheet
Sentinel Identity · Version 1 · 2026-10-01
Free to copy and adapt. This is a blank planning aid, not a tenant diagnostic.

## 1. Establish the scope
- Incident / owner:
- Affected application and resource:
- Affected population (use redacted identifiers):
- First observed / last known working (include timezone):
- Reproduction steps:
- One known-good comparison:
- Business impact:

## 2. Match the event
- Event timestamp and timezone:
- Request / correlation ID:
- Sign-in type:
- Exact error code and failure reason:
- Client application / browser / device:
- Authentication details:
- Conditional Access result:
- Enforced policy results:
- Report-only policy results (record separately):
- Evidence location (approved internal system, not credentials):

## 3. Separate evidence from explanation
| Observation | Possible explanation | Evidence that would disprove it | Next check | Owner |
| --- | --- | --- | --- | --- |
| | | | | |

A report-only finding is not proof that the policy blocked the sign-in.
A successful event does not prove every step of an application flow succeeded.

## 4. Review the proposed change
- Is the block intended?
- Policy / application owner:
- Smallest proposed change:
- Approval and time window:
- Original configuration / restore procedure:
- Rollback trigger:

## 5. Verify and hand over
- Retest timestamp:
- New event / correlation ID:
- Expected versus observed result:
- Checks for unintended access:
- Remaining questions:
- Next owner and check-in time:

Never include access tokens, secrets, passwords, or unredacted personal data in public tickets.
Reference: https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access
