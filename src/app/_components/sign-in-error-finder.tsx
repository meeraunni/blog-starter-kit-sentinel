"use client";

import { useState } from "react";
import Link from "next/link";

const errors = [
  {
    code: "53003", title: "Blocked by Conditional Access", keywords: "policy device compliant blocked",
    meaning: "Conditional Access blocked this request.",
    inspect: "Open the failed sign-in, then its Conditional Access tab. Identify the failed policy and inspect its grant controls alongside the event’s device and resource details.",
    checks: ["Does the failing event match the user, time, and application in the report?", "Which policy failed, and which requirement was unmet?", "Is the block intended for this user and resource?"],
    avoid: "Do not disable the policy simply because access was blocked.",
    slug: "aadsts53003-access-blocked-by-conditional-access",
  },
  {
    code: "50076", title: "MFA interaction required", keywords: "multifactor prompt authentication silent",
    meaning: "The request requires multifactor authentication.",
    inspect: "Open Authentication Details and Conditional Access for the matching sign-in. Check whether the client started an interactive request after the interruption.",
    checks: ["Did the user receive an MFA prompt?", "Did a later attempt for the same resource succeed?", "If this is a custom app, does it handle an interaction-required response?"],
    avoid: "A request for MFA is not proof that MFA is broken. Check the subsequent result.",
    slug: "aadsts50076-mfa-required-microsoft-entra",
  },
  {
    code: "50034", title: "User account not found", keywords: "username tenant guest directory missing",
    meaning: "The account was not found in the requested directory.",
    inspect: "Compare the entered sign-in name and target tenant with the user’s directory record. For external access, check the intended guest account and tenant.",
    checks: ["Is the sign-in name spelled correctly?", "Is the application sending the request to the intended tenant?", "Should this user have a member or guest account in that tenant?"],
    avoid: "Do not create a duplicate account before checking the sign-in name and tenant.",
    slug: "aadsts50034-user-account-not-found-microsoft-entra",
  },
  {
    code: "50105", title: "User not assigned to the application", keywords: "assignment enterprise app role group",
    meaning: "The signed-in user lacks an assignment to the application.",
    inspect: "Open the target enterprise application and review Users and groups. Compare the assignment with the identity in the failed event.",
    checks: ["Are you inspecting the same enterprise application as the failed request?", "Does the intended assignment include this user?", "Is the requested application role the one the user should receive?"],
    avoid: "Confirm access approval before adding an assignment or changing assignment requirements.",
    slug: "aadsts50105-user-not-assigned-microsoft-entra",
  },
  {
    code: "65001", title: "Application consent required", keywords: "permissions scopes consent administrator",
    meaning: "Required user or administrator consent is missing.",
    inspect: "Compare the application’s requested permissions with the grants in the target tenant. Establish whether a supported interactive consent flow is possible.",
    checks: ["Which application, resource, and scopes were requested?", "Is consent missing in this tenant, or is the request targeting the wrong tenant?", "Do those permissions require administrator review?"],
    avoid: "Do not grant broad administrator consent just to clear the error.",
    slug: "aadsts65001-consent-required-microsoft-entra",
  },
  {
    code: "7000215", title: "Invalid client secret", keywords: "application credential secret value authentication",
    meaning: "The application supplied an invalid client secret.",
    inspect: "Have the application owner compare the deployed credential configuration with the intended app registration and tenant. Keep credential values out of logs and this page.",
    checks: ["Was the secret value configured, rather than its identifier?", "Does the credential belong to the intended application?", "Did a deployment or rotation leave an old configuration in use?"],
    avoid: "Never paste a client secret into a lookup tool or support screenshot.",
    slug: "aadsts7000215-invalid-client-secret-microsoft-entra",
  },
];
const reference = "https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes";

export default function SignInErrorFinder() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("53003");
  const normalized = query.trim().toLowerCase();
  const code = normalized.match(/^(?:aadsts\s*)?(\d+)$/)?.[1];
  const matches = errors.filter((item) => code ? item.code === code : `${item.code} ${item.title} ${item.keywords}`.toLowerCase().includes(normalized));
  const active = matches.find((item) => item.code === selected) || matches[0];

  return (
    <section className="workbench error-finder" aria-labelledby="error-finder-title">
      <p className="eyebrow">Sign-in troubleshooting</p>
      <h2 id="error-finder-title">Find the next check for your Entra error</h2>
      <p>Look up an error code or search a symptom, then follow the checks and the full walkthrough.</p>
      <label htmlFor="error-query">Error code or symptom</label>
      <div className="error-search-row">
        <input id="error-query" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try AADSTS50076, 53003, or consent" autoComplete="off" spellCheck={false} maxLength={100} aria-describedby="error-query-help" />
        {query && <button type="button" onClick={() => setQuery("")} className="journal-text-link">Clear search</button>}
      </div>
      <p id="error-query-help" className="error-helper">Search stays in your browser. Enter a code or short symptom, not a full sign-in log.</p>
      <p role="status" className="error-result-count">{matches.length} {matches.length === 1 ? "guide" : "guides"} found</p>
      {active ? <div className="error-results">
        <div className="error-choices" role="group" aria-label="Matching error guides">
          {matches.map((item) => <button key={item.code} type="button" aria-pressed={active.code === item.code} onClick={() => setSelected(item.code)}><strong>AADSTS{item.code}</strong><span>{item.title}</span></button>)}
        </div>
        <article className="error-detail" aria-labelledby="selected-error-title">
          <p className="eyebrow">AADSTS{active.code}</p>
          <h3 id="selected-error-title">{active.title}</h3>
          <p>{active.meaning}</p>
          <h4>Where to look</h4><p>{active.inspect}</p>
          <h4>What to check</h4><ol>{active.checks.map((check) => <li key={check}>{check}</li>)}</ol>
          <p className="error-caution">{active.avoid}</p>
          <Link className="journal-button" href={`/posts/${active.slug}`}>Read the full troubleshooting guide →</Link>
          <a className="journal-text-link" href={`https://login.microsoftonline.com/error?code=${active.code}`}>Look up this code with Microsoft ↗</a>
        </article>
      </div> : <div className="error-empty"><h3>No guide matches this search</h3><p>This finder covers six common errors. Try a code such as 50076 or a keyword such as “consent”.</p>{code ? <a className="journal-text-link" href={`https://login.microsoftonline.com/error?code=${code}`}>Check AADSTS{code} in Microsoft’s error lookup ↗</a> : <a className="journal-text-link" href={reference}>Browse Microsoft’s error reference ↗</a>}</div>}
      <p className="error-source">Definitions checked against <a href={reference}>Microsoft’s error reference</a> on October 4, 2026. The checks are an editorial starting point; the code alone does not identify the root cause.</p>
    </section>
  );
}
