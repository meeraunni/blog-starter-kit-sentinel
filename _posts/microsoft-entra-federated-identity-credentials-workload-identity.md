---
title: "Federated Identity Credentials in Microsoft Entra: Replacing Client Secrets for GitHub, Azure DevOps, and Kubernetes Workloads"
excerpt: "Federated Identity Credentials let an external workload — GitHub Actions, Azure DevOps Pipelines, Kubernetes pods, AWS, GCP — call Microsoft Entra with an OIDC token instead of a long-lived client secret. The trust model, the setup for the three most common scenarios, and the operational story for rotation and revocation."
coverImage: "/assets/blog/microsoft-entra-federated-identity-credentials-workload-identity/diagram.svg"
date: "2026-06-10T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/microsoft-entra-federated-identity-credentials-workload-identity/diagram.svg"
---

## The credential pattern this replaces

The standard pattern for letting a CI/CD pipeline call Azure or Microsoft Graph has, for years, been: create an app registration in Microsoft Entra, generate a **client secret**, paste the secret into the pipeline's secrets store (GitHub Actions secrets, Azure DevOps variable groups, Kubernetes Secret objects), and have the pipeline use it to acquire access tokens.

The problems with that pattern are well known. Secrets leak into logs. Secrets expire and rotation is a manual chore that gets skipped. Secrets persist longer than the trust assumptions that justified issuing them. A leaked GitHub repo with a client secret in the wrong place becomes a backdoor into the tenant. Every credential lifecycle conversation in 2026 is about getting rid of secrets, not about rotating them on a better schedule.

**Federated Identity Credentials (FIC)** are the Microsoft Entra answer to that conversation. Instead of holding a client secret, the external workload (GitHub Actions, Azure DevOps, AWS, GCP, Kubernetes, anywhere with an OIDC-compliant token issuer) presents an OIDC ID token that it can prove was issued to *exactly* this workflow / this repository / this branch / this pod. Microsoft Entra verifies the OIDC token against the configured trust, and if it matches, mints an access token for the corresponding Entra application — no secret in the loop.

The trust is what makes this safe. FIC doesn't just trust "tokens signed by GitHub" — that would be a backdoor for every GitHub user on earth. It trusts "tokens signed by GitHub, where the issuer is GitHub Actions, the subject matches `repo:myorg/myrepo:ref:refs/heads/main`, and the audience matches `api://AzureADTokenExchange`." The combination is tight enough that only the specific workflow in the specific repo on the specific branch can claim the credential.

This article is the operator's view of FIC: the trust model in detail, configuration for the three most common scenarios (GitHub Actions, Azure DevOps, Kubernetes), the rotation and revocation story (much shorter than the client-secret version), and the auditing pattern that proves to your security team that you actually got rid of the secrets.

The Microsoft references throughout are [Workload identity federation overview](https://learn.microsoft.com/entra/workload-id/workload-identity-federation), [Configure an app to trust an external IdP](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust), and the scenario-specific guides for [GitHub Actions](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-github), [Azure DevOps](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-azure-devops), and [Kubernetes](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-kubernetes).

## The trust model, in detail

Every FIC is bound to either an **app registration** or a **user-assigned managed identity**. The FIC itself is a four-field record:

| Field | What it does |
|---|---|
| **Issuer** | The OIDC discovery URL of the trusted token issuer (e.g., `https://token.actions.githubusercontent.com`) |
| **Subject** | The exact subject claim that must appear in the OIDC token — the most security-critical field |
| **Audience** | The audience claim Microsoft Entra expects (typically `api://AzureADTokenExchange`) |
| **Name** | A friendly identifier for the FIC entry |

When the external workload calls Microsoft Entra's token endpoint with `grant_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer` and the OIDC ID token as `client_assertion`, Entra:

1. Reads the token, extracts `iss`, `sub`, `aud`.
2. Looks up FIC records on the target app/identity that match all three.
3. Validates the token's signature against the issuer's JWKS endpoint (discovered from the issuer URL).
4. Validates standard claims (expiry, not-before, issuer signature).
5. If all checks pass, mints an access token for the app/identity at the requested scopes.

If any of those checks fails, the request returns `invalid_client`. There is no secret involved, no key material to rotate, and no shared state between the workload and Entra beyond the FIC configuration.

> [!IMPORTANT]
> The **subject** field is where security lives. A wildcard subject (`*`) means any workflow at the issuer can claim the identity. A specific subject (`repo:contoso/finance-app:ref:refs/heads/main`) means only that exact workflow can. Always use the most specific subject your workflow allows.

## Scenario 1: GitHub Actions calling Azure

The most common FIC scenario by volume. A GitHub Actions workflow needs to deploy to Azure, run `az` commands, or hit Microsoft Graph.

### Step 1: Create the app registration (or use a managed identity)

For new scenarios I recommend a user-assigned managed identity rather than an app registration — managed identities have no `appPassword` field at all, which makes "did we leave a secret on it?" a question with a structurally guaranteed answer.

```powershell
# Create the user-assigned managed identity in Azure
az identity create --resource-group rg-cicd --name mi-github-prod --location eastus

# Capture the resource ID and the principal ID (the latter is the Entra object ID)
$miResource = az identity show --resource-group rg-cicd --name mi-github-prod --query id -o tsv
$miPrincipal = az identity show --resource-group rg-cicd --name mi-github-prod --query principalId -o tsv
```

### Step 2: Grant the managed identity the Azure RBAC roles it needs

```powershell
# Example: Contributor on the deployment-target resource group
az role assignment create \
    --assignee-object-id $miPrincipal \
    --assignee-principal-type ServicePrincipal \
    --role "Contributor" \
    --scope "/subscriptions/<sub-id>/resourceGroups/rg-app-prod"
```

For Microsoft Graph scopes (rarer in CI/CD but it happens), grant via PowerShell:

```powershell
Connect-MgGraph -Scopes "AppRoleAssignment.ReadWrite.All", "Application.Read.All"
# Grant Graph application permission to the managed identity
$graphSp = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"
$role = $graphSp.AppRoles | Where-Object { $_.Value -eq "User.Read.All" }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miPrincipal `
    -PrincipalId $miPrincipal -ResourceId $graphSp.Id -AppRoleId $role.Id
```

### Step 3: Add the FIC

```powershell
$fic = @{
    name      = "github-contoso-finance-app-main"
    issuer    = "https://token.actions.githubusercontent.com"
    subject   = "repo:contoso/finance-app:ref:refs/heads/main"
    audiences = @("api://AzureADTokenExchange")
}
az identity federated-credential create --identity-name mi-github-prod \
    --resource-group rg-cicd --name $fic.name \
    --issuer $fic.issuer --subject $fic.subject \
    --audiences ($fic.audiences -join ',')
```

The subject format for GitHub Actions follows the pattern `repo:OWNER/REPO:CONTEXT` where context is one of `ref:refs/heads/BRANCH`, `pull_request`, `environment:NAME`, or `ref:refs/tags/TAG`. For protected-environment scenarios (recommended for production deploys), use the environment form so only workflows running in the named GitHub Environment can claim the identity.

### Step 4: Configure the GitHub workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write    # required to receive the OIDC token from GitHub
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Azure login (federated)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}     # managed identity client ID
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Run deploy
        run: |
          az group list --query "[].name"
```

No `azure/login@v2` secrets configuration is needed. The action automatically detects the OIDC token GitHub gives it and exchanges it for an Azure access token via FIC. The `vars` block references repository variables (visible in the workflow, not sensitive) — the only thing that *was* a secret in the old pattern (the client secret) has nothing to replace it.

## Scenario 2: Azure DevOps service connection

Azure DevOps has its own OIDC issuer per organisation. The configuration is similar but with the DevOps-specific subject format.

```powershell
# Subject format: sc://ORGANISATION/PROJECT/SERVICE_CONNECTION_NAME
$ficName = "ado-contoso-finance-prod"
$subject = "sc://contoso/finance/prod-deploy"

az identity federated-credential create --identity-name mi-ado-prod \
    --resource-group rg-cicd --name $ficName \
    --issuer "https://vstoken.dev.azure.com/<organisation-id>" \
    --subject $subject --audiences "api://AzureADTokenExchange"
```

The Azure DevOps service connection is configured as **Workload Identity Federation** (not Service Principal). Once that's set, pipelines using the connection get tokens through FIC without storing any client secret.

> [!NOTE]
> Azure DevOps has a workflow for migrating existing service connections from secret-based to FIC-based. Use it. The conversion is non-disruptive — pipelines pointing at the same connection name continue working.

## Scenario 3: Kubernetes pods (any cloud)

This is the pattern that lets a pod running anywhere — AKS, EKS, GKE, on-prem — call Microsoft Entra without a client secret. The Kubernetes cluster signs OIDC tokens for service accounts; Microsoft Entra trusts those tokens via FIC.

```powershell
# Get the cluster's OIDC issuer URL
# On AKS:
$oidcIssuer = az aks show --resource-group rg-aks --name aks-prod --query oidcIssuerProfile.issuerUrl -o tsv

# Subject format for Kubernetes service account:
# system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT_NAME
$subject = "system:serviceaccount:finance:deploy-bot"

az identity federated-credential create --identity-name mi-k8s-finance \
    --resource-group rg-cicd --name "k8s-finance-deploybot" \
    --issuer $oidcIssuer --subject $subject \
    --audiences "api://AzureADTokenExchange"
```

The Kubernetes side requires Workload Identity to be enabled on the cluster, plus the corresponding service account annotation:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deploy-bot
  namespace: finance
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
```

Pods running with this service account get the OIDC token automatically projected; SDK calls to Microsoft Entra use it transparently via the workload identity webhook.

## The rotation and revocation story

This is the part that makes FIC operationally compelling. The old client-secret lifecycle was:

- Generate a secret with a 24-month expiry.
- Set a calendar reminder at month 23.
- Two months before expiry, generate a new secret, update every pipeline that uses it, ensure none is missed, eventually delete the old secret.
- Pray nobody forks the codebase with the secret in it.

The FIC lifecycle is:

- There is nothing to rotate. The OIDC issuer rotates its own signing keys; Entra revalidates against the JWKS on each request.
- If you want to revoke access, delete the FIC entry. The workload immediately stops being able to obtain tokens; existing access tokens expire on their normal schedule (60-90 min) but no new ones are issued.
- If the workload itself is compromised (the GitHub repo is taken over), the attacker still can't claim the identity unless they can also reproduce the exact OIDC subject — which means owning the repo *and* having permission to push to the protected branch *and* triggering the right workflow context.

```powershell
# Revoke an FIC instantly
az identity federated-credential delete --identity-name mi-github-prod \
    --resource-group rg-cicd --name "github-contoso-finance-app-main" --yes
```

## Auditing — proving you eliminated the secrets

The natural next question from a security team: "how do we prove the migration is done?" Two queries.

```powershell
# 1. Find app registrations and SPs that still have client secrets or certificates
Connect-MgGraph -Scopes "Application.Read.All"
$secretsHolders = Get-MgApplication -All | Where-Object {
    $_.PasswordCredentials.Count -gt 0 -or $_.KeyCredentials.Count -gt 0
}
$secretsHolders | Select-Object DisplayName, AppId,
    @{n="Secrets";e={$_.PasswordCredentials.Count}},
    @{n="Certs";e={$_.KeyCredentials.Count}} |
    Format-Table -AutoSize
```

```powershell
# 2. Find apps/SPs that have FICs configured (the target state)
$ficHolders = @()
Get-MgApplication -All | ForEach-Object {
    $fics = Get-MgApplicationFederatedIdentityCredential -ApplicationId $_.Id
    if ($fics) {
        $ficHolders += [pscustomobject]@{
            App      = $_.DisplayName
            AppId    = $_.AppId
            FicCount = $fics.Count
        }
    }
}
$ficHolders | Format-Table -AutoSize
```

The migration is "done" when secret-holders for CI/CD scenarios is empty (excluding the legitimate exceptions you've documented — usually break-glass identities and legacy apps with vendor-provided integrations).

> [!WARNING]
> Don't just delete the old client secrets on the day you add the FIC. Run both in parallel for a sprint, watch the audit logs to confirm new tokens are being issued via the FIC path, and only then revoke the secret. Audit logs distinguish FIC-based grants from secret-based grants in the `serviceCredentialType` field.

## The four mistakes to avoid

### Mistake 1: Wildcard subjects "to make it work"

The temptation, when a FIC isn't authenticating, is to widen the subject to `*` until it does, then forget to tighten it back. Don't. Always use the most specific subject your workflow allows. Many shops adopt a CI policy that fails CI on any FIC entry with a wildcard subject.

### Mistake 2: Reusing one managed identity across many unrelated workflows

A single managed identity with broad RBAC, used by ten different GitHub repos and three different Azure DevOps projects, is convenient until you need to revoke access for one of them. Then you discover that revoking the FIC for one of them breaks all of them. Prefer one managed identity per workload context, with the smallest possible RBAC scope.

### Mistake 3: Forgetting that GitHub OIDC tokens are issued per workflow run, not per workflow definition

A workflow that fails at the OIDC token step often does so because the `permissions: id-token: write` line is missing. The token is requested per run; without that permission, GitHub doesn't issue one and FIC has nothing to validate.

### Mistake 4: Not testing FIC revocation

The lifecycle story is one of FIC's biggest values, but I've seen rollouts where revocation was never tested. Run a fire drill at least once: delete the FIC for a non-critical workflow, confirm the workflow fails the next time it runs, restore the FIC. Confirms the story works and exercises the operational muscle.

## Common questions

### Can I use FIC for app-only access (no user context) to Microsoft Graph?

Yes — that's one of the primary use cases. The Graph application permissions you assign to the managed identity / app registration determine the scopes the FIC-mediated access token can carry. Standard rules apply (admin consent for application permissions, etc.).

### Is FIC supported by all Azure SDK clients?

The major SDKs (.NET, Python, Go, JavaScript, Java) support it through their default credential chains — `DefaultAzureCredential` picks up workload identity automatically when the environment is configured. For older SDKs or custom HTTP clients, you fetch the OIDC token and call the Entra `/oauth2/v2.0/token` endpoint directly with the `jwt-bearer` grant type.

### Can a managed identity have multiple FICs?

Yes. A common pattern is one managed identity with one FIC per environment (dev, staging, prod) where each FIC has a different subject (different GitHub environment names). Same identity, same RBAC, different validation rules per pipeline context.

### Does FIC work with Microsoft Entra B2C or External ID?

Workload identity federation is an Entra workforce-tenant feature. External ID has different identity models.

### What's the failure mode if the external OIDC issuer's signing keys rotate during a request?

Microsoft Entra caches the issuer's JWKS for a short period and refetches on cache miss / key-not-found. In practice, a rotation in flight produces a single retried token request, not a failure. Tested by all major SDKs as part of their token-acquisition flow.

### Can I migrate existing client-secret-based app registrations to FIC without breaking pipelines?

Yes — add the FIC, update the workflow to use the FIC path, leave the client secret in place during the transition, verify, then revoke the secret. The two credential types coexist on the same app registration.

## What to take away

Federated Identity Credentials are how you stop holding client secrets for CI/CD scenarios in 2026. The trust model is tighter than secrets because it can require not just "I trust GitHub" but "I trust this specific repo on this specific branch via this specific workflow." Configuration is one-time per workflow context. Rotation is "there is nothing to rotate." Revocation is a single API call. The four mistakes (wildcard subjects, over-shared managed identities, missing `id-token: write` permission, untested revocation) are predictable and avoidable. Done that way, the next "we found a secret in a public repo" incident your team has won't be about Azure access — because there's no secret to find.

## References

- [Workload identity federation overview — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation)
- [Configure an app to trust an external IdP — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust)
- [Configure a federated identity credential on a managed identity — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-config-app-trust-managed-identity)
- [GitHub Actions OIDC with Azure — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-github)
- [Azure DevOps OIDC with Azure — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-azure-devops)
- [Kubernetes OIDC with Azure (AKS Workload Identity) — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-kubernetes)
- [`DefaultAzureCredential` reference — Microsoft Learn](https://learn.microsoft.com/azure/developer/python/sdk/authentication-overview)
