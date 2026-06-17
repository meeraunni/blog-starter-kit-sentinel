---
title: "Federated Identity Credentials: How To Stop Holding Client Secrets for Your CI/CD Pipelines"
excerpt: "The pattern of generating a client secret, pasting it into GitHub Actions, and forgetting about it for two years is the credential pattern every security team wants gone. Federated Identity Credentials are how it actually goes away. Here's the trust model, the setup for GitHub, Azure DevOps, and Kubernetes, and the audit query that proves you got rid of the secrets."
coverImage: "/assets/blog/microsoft-entra-federated-identity-credentials-workload-identity/diagram.svg"
date: "2026-06-10T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/microsoft-entra-federated-identity-credentials-workload-identity/diagram.svg"
---

The standard pattern for letting a CI/CD pipeline call Azure or Microsoft Graph has been the same for years. Create an app registration in Entra, generate a client secret, paste the secret into the pipeline's secrets store, have the pipeline use it to acquire access tokens. The problems are well known. Secrets leak into logs. Secrets expire and rotation is a manual chore that gets skipped. Secrets persist longer than the trust assumptions that justified issuing them. A leaked repo with a client secret in the wrong place becomes a backdoor into the tenant. Every credential lifecycle conversation in 2026 is about getting rid of secrets, not about rotating them on a better schedule.

Federated Identity Credentials are the Entra answer to that conversation. Instead of holding a client secret, the external workload — GitHub Actions, Azure DevOps Pipelines, Kubernetes pods, anywhere with an OIDC-compliant token issuer — presents an OIDC ID token that it can prove was issued to exactly this workflow in this repository on this branch. Entra verifies the token against a configured trust, and if everything matches, mints an access token for the corresponding Entra application. No secret in the loop, anywhere.

What makes this safe is the precision of the trust. FIC doesn't just trust "tokens signed by GitHub" — that would be a backdoor for every GitHub user on earth. It trusts tokens signed by GitHub *where the issuer is GitHub Actions, the subject matches `repo:myorg/myrepo:ref:refs/heads/main`, and the audience matches `api://AzureADTokenExchange`*. The combination is tight enough that only the specific workflow in the specific repo on the specific branch can claim the credential.

This piece is the operator's view: the trust model in the detail it deserves, configuration for the three most common scenarios (GitHub, Azure DevOps, Kubernetes), the rotation and revocation story (much shorter than the client-secret version), and the auditing query that proves to your security team you actually got rid of the secrets. The Microsoft references — [workload identity federation overview](https://learn.microsoft.com/entra/workload-id/workload-identity-federation), [configure an external IdP trust](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust), and the scenario-specific guides for [GitHub](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-github), [Azure DevOps](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-azure-devops), and [Kubernetes](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-kubernetes) — describe each piece in detail.

## The trust model in detail

Every FIC is bound to either an app registration or a user-assigned managed identity. The FIC itself is a four-field record:

| Field | What it does |
|---|---|
| **Issuer** | The OIDC discovery URL of the trusted token issuer (e.g., `https://token.actions.githubusercontent.com`) |
| **Subject** | The exact subject claim that must appear in the OIDC token — the most security-critical field |
| **Audience** | The audience claim Entra expects (typically `api://AzureADTokenExchange`) |
| **Name** | A friendly identifier for the entry |

When the external workload calls Entra's token endpoint with `grant_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer` and the OIDC ID token as the `client_assertion`, Entra reads the token, extracts `iss`, `sub`, and `aud`, looks up FIC records on the target app or identity that match all three, validates the token's signature against the issuer's JWKS endpoint (discovered from the issuer URL), validates standard claims like expiry and not-before, and only if all that passes does it mint an access token at the requested scopes. Any check failure returns `invalid_client`. There's no secret in the conversation, no key material to rotate, and no shared state between the workload and Entra beyond the FIC configuration.

> [!IMPORTANT]
> The **subject** field is where security lives. A wildcard subject (`*`) means any workflow at the issuer can claim the identity, which is a backdoor in disguise. A specific subject like `repo:contoso/finance-app:ref:refs/heads/main` means only that exact workflow can. Always use the most specific subject your workflow allows. Adopt a CI policy that fails the build on any FIC entry with a wildcard subject, because the temptation to use one when the specific one isn't working is real.

## Scenario one: GitHub Actions calling Azure

By volume, this is the most common FIC scenario. A GitHub Actions workflow needs to deploy to Azure, run `az` commands, or hit Graph.

For new scenarios I'd use a user-assigned managed identity rather than an app registration. Managed identities don't have an `appPassword` field at all, which makes "did we leave a secret on it" a question with a structurally guaranteed answer.

```powershell
# Create the user-assigned managed identity in Azure
az identity create --resource-group rg-cicd --name mi-github-prod --location eastus

# Capture the resource ID and the principal ID (the Entra object ID)
$miResource  = az identity show --resource-group rg-cicd --name mi-github-prod --query id -o tsv
$miPrincipal = az identity show --resource-group rg-cicd --name mi-github-prod --query principalId -o tsv
```

Grant the managed identity the Azure RBAC roles it needs. Smallest-possible scope, always:

```powershell
az role assignment create \
    --assignee-object-id $miPrincipal \
    --assignee-principal-type ServicePrincipal \
    --role "Contributor" \
    --scope "/subscriptions/<sub-id>/resourceGroups/rg-app-prod"
```

For Microsoft Graph scopes — rarer in CI/CD but it happens — grant via PowerShell:

```powershell
Connect-MgGraph -Scopes "AppRoleAssignment.ReadWrite.All", "Application.Read.All"
$graphSp = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"
$role = $graphSp.AppRoles | Where-Object { $_.Value -eq "User.Read.All" }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miPrincipal `
    -PrincipalId $miPrincipal -ResourceId $graphSp.Id -AppRoleId $role.Id
```

Now add the FIC:

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

The GitHub workflow side:

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
        run: az group list --query "[].name"
```

No secrets configuration in the action, by design. The login step automatically detects the OIDC token GitHub gives it and exchanges it for an Azure access token via FIC. The `vars` block references repository variables — visible in the workflow, not sensitive. The thing that *was* a secret in the old pattern has nothing replacing it because nothing is needed.

## Scenario two: Azure DevOps service connection

Azure DevOps has its own OIDC issuer per organisation, and the configuration is similar but with the DevOps-specific subject format:

```powershell
# Subject format: sc://ORGANISATION/PROJECT/SERVICE_CONNECTION_NAME
$ficName = "ado-contoso-finance-prod"
$subject = "sc://contoso/finance/prod-deploy"

az identity federated-credential create --identity-name mi-ado-prod \
    --resource-group rg-cicd --name $ficName \
    --issuer "https://vstoken.dev.azure.com/<organisation-id>" \
    --subject $subject --audiences "api://AzureADTokenExchange"
```

The Azure DevOps service connection itself is configured as Workload Identity Federation (not Service Principal). Once that's set, pipelines using the connection get tokens through FIC without storing any client secret.

Azure DevOps also has a built-in workflow for migrating existing service connections from secret-based to FIC-based. Use it. The conversion is non-disruptive — pipelines pointing at the same connection name continue working through the cutover.

## Scenario three: Kubernetes pods, any cloud

This is the pattern that lets a pod running anywhere — AKS, EKS, GKE, on-prem — call Microsoft Entra without a client secret. The Kubernetes cluster signs OIDC tokens for service accounts, and Entra trusts those tokens via FIC.

```powershell
# Get the cluster's OIDC issuer URL — AKS version
$oidcIssuer = az aks show --resource-group rg-aks --name aks-prod `
    --query oidcIssuerProfile.issuerUrl -o tsv

# Subject format for Kubernetes service accounts:
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

Pods running under this service account get the OIDC token projected automatically, and SDK calls to Entra use it transparently via the workload identity webhook. The pod authors don't write any auth code beyond standard SDK initialisation.

## The rotation and revocation story is the value

This is the part that makes FIC operationally compelling. The old client-secret lifecycle was: generate a secret with a twenty-four-month expiry, set a calendar reminder at month twenty-three, two months before expiry generate a new secret and update every pipeline that uses it, ensure none is missed, eventually delete the old secret, pray nobody forks the codebase with the secret still in it.

The FIC lifecycle is: nothing to rotate, because there's no key material on your side. The OIDC issuer rotates its own signing keys; Entra revalidates against the JWKS on each request, so rotation upstream is invisible to you. If you want to revoke access, delete the FIC entry. The workload immediately stops being able to obtain new tokens; existing access tokens expire on their normal schedule. If the workload itself is compromised — the GitHub repo is taken over — the attacker still can't claim the identity unless they can reproduce the exact OIDC subject, which means owning the repo, having permission to push to the protected branch, *and* triggering the right workflow context.

```powershell
# Revoke an FIC instantly
az identity federated-credential delete --identity-name mi-github-prod \
    --resource-group rg-cicd --name "github-contoso-finance-app-main" --yes
```

## Proving you got rid of the secrets

The natural next question from a security team is "how do we prove the migration is done." Two queries do the work.

Find app registrations and SPs that still have client secrets or certificates — your remaining attack surface:

```powershell
Connect-MgGraph -Scopes "Application.Read.All"
$secretsHolders = Get-MgApplication -All | Where-Object {
    $_.PasswordCredentials.Count -gt 0 -or $_.KeyCredentials.Count -gt 0
}
$secretsHolders | Select-Object DisplayName, AppId,
    @{n="Secrets";e={$_.PasswordCredentials.Count}},
    @{n="Certs";e={$_.KeyCredentials.Count}} |
    Format-Table -AutoSize
```

Find apps that have FICs configured — your target state:

```powershell
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

The migration is "done" when secret-holders for CI/CD scenarios is empty, excluding the legitimate exceptions you've documented — usually break-glass identities and a small set of legacy apps with vendor-provided integrations that haven't migrated yet.

> [!WARNING]
> Don't delete old client secrets on the day you add the FIC. Run both in parallel for a sprint, watch audit logs to confirm new tokens are being issued via the FIC path (the `serviceCredentialType` field distinguishes them), and only then revoke the secret. Parallel running is the safety net that catches the workflow you forgot needed updating.

## The four mistakes to avoid

The first is wildcard subjects. The temptation when an FIC isn't authenticating is to widen the subject to `*` until it does, then forget to tighten it back. Don't. Always use the most specific subject your workflow allows.

The second is reusing one managed identity across many unrelated workflows. A single managed identity with broad RBAC used by ten different repos and three different DevOps projects is convenient until you need to revoke access for one of them. Then you discover revoking it breaks all ten. One managed identity per workload context, smallest possible RBAC scope per identity.

The third is forgetting the `permissions: id-token: write` line in the GitHub workflow. The OIDC token is issued per run, not per workflow definition. Without the permission set, GitHub doesn't issue a token and FIC has nothing to validate.

The fourth is not testing FIC revocation. The lifecycle story is one of FIC's biggest values, but I've seen rollouts where revocation was never tested. Run a fire drill at least once. Delete the FIC for a non-critical workflow, confirm the workflow fails the next time it runs, restore the FIC. That confirms the story works and exercises the operational muscle for the day the drill stops being a drill.

## Things I get asked

*Can FIC do app-only access to Microsoft Graph?* Yes, that's a primary use case. The Graph application permissions assigned to the managed identity or app registration determine the scopes the FIC-mediated access token can carry. Admin consent still applies for application permissions, all the usual rules.

*Is FIC supported by all the Azure SDKs?* The major SDKs (.NET, Python, Go, JavaScript, Java) support it through their default credential chains. `DefaultAzureCredential` picks up workload identity automatically when the environment is configured. For older SDKs or custom HTTP clients, you fetch the OIDC token and call Entra's `/oauth2/v2.0/token` endpoint directly with the `jwt-bearer` grant type.

*Can a managed identity have multiple FICs?* Yes. A common pattern is one managed identity with one FIC per environment (dev, staging, prod), each FIC having a different subject (different GitHub environment names). Same identity, same RBAC, different validation rules per pipeline context.

*Does FIC work with Entra External ID?* Workload identity federation is an Entra workforce-tenant feature. External ID has different identity models.

*What happens if the external issuer's signing keys rotate during a request?* Entra caches the issuer's JWKS for a short period and refetches on cache miss. In practice a rotation in flight produces a single retried token request, not a failure. All the major SDKs handle this as part of their token-acquisition flow.

*Can I migrate existing client-secret apps to FIC without breaking pipelines?* Yes. Add the FIC, update the workflow to use the FIC path, leave the client secret in place during the transition, verify, then revoke the secret. The two credential types coexist on the same app registration.

## Where to read further

- [Workload identity federation overview — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation)
- [Configure an external IdP trust — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust)
- [Federated credential on a managed identity — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-config-app-trust-managed-identity)
- [GitHub Actions OIDC with Azure — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-github)
- [Azure DevOps OIDC with Azure — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-azure-devops)
- [Kubernetes OIDC with Azure (AKS Workload Identity) — Microsoft Learn](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust-kubernetes)
- [`DefaultAzureCredential` reference — Microsoft Learn](https://learn.microsoft.com/azure/developer/python/sdk/authentication-overview)
