"use client";

import { useState } from "react";

const fields = [
  ["reference", "Incident reference", "Internal ticket or short label"],
  ["time", "Event time and timezone", "2026-10-01 14:05 UTC"],
  ["application", "Application / resource", "Application and resource names"],
  ["code", "Error code", "For example, AADSTS53003"],
  [
    "correlation",
    "Correlation or request ID",
    "ID from the matching sign-in record",
  ],
  ["scope", "Affected scope", "One user, one application, or a wider group?"],
] as const;
const outcomes = {
  unknown:
    "Find the matching sign-in event using its time, application, and request or correlation ID. Record the actual result before selecting a cause.",
  failure:
    "Record every failed Conditional Access policy and its grant controls. Compare the sign-in conditions with the policy scope. Confirm whether the block is intended before proposing a change.",
  success:
    "Record that Conditional Access succeeded for this event. Follow the application error, resource, and any subsequent sign-in events; this result alone does not establish that the entire application flow succeeded.",
  notApplied:
    "Record why relevant policies were not applied. Check the user, resource, client, and conditions for this event. Do not assume a policy caused the failure.",
  reportOnly:
    "Record the report-only result separately from enforced policies. Report-only findings describe what a policy would do; inspect enforced results for the actual access decision.",
};
type Outcome = keyof typeof outcomes;

export default function IncidentWorkbench() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Outcome>("unknown");
  const [evidence, setEvidence] = useState("");
  const [status, setStatus] = useState("");
  const summary = [
    "# Sign-in investigation note",
    "",
    "Prepared with Sentinel Identity / https://www.sentinelidentity.ca/resources",
    "",
    ...fields.map(
      ([key, label]) => `${label}: ${values[key]?.trim() || "Not recorded"}`,
    ),
    `Conditional Access observation: ${{ unknown: "Not yet inspected", failure: "Failure", success: "Success", notApplied: "Not applied", reportOnly: "Report-only result" }[outcome]}`,
    "",
    "## Observed evidence",
    evidence.trim() || "Not recorded",
    "",
    "## Next investigation step",
    outcomes[outcome],
    "",
    "## Proposed change (requires review)",
    "Owner:",
    "Smallest change:",
    "Approval:",
    "Rollback:",
    "",
    "## Verification",
    "Retest time:",
    "New sign-in record:",
    "Expected result:",
    "Observed result:",
    "Outstanding questions:",
    "",
    "This note organises observations; it is not an automated diagnosis. Confirm findings against the actual sign-in logs and current Microsoft documentation.",
  ].join("\n");

  function download() {
    const url = URL.createObjectURL(
      new Blob([summary], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "sign-in-investigation.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Investigation note downloaded.");
  }
  return (
    <section
      id="investigation"
      className="workbench"
      aria-labelledby="workbench-title"
    >
      <div className="workbench-heading">
        <p className="eyebrow">01 / Browser tool</p>
        <h2 id="workbench-title">Build a sign-in investigation note.</h2>
        <p>
          Capture what you observed, separate it from the suspected cause, and
          leave the next administrator a useful handover.
        </p>
        <p className="workbench-privacy">
          These fields stay in this page’s memory; the tool does not submit or
          save them. Download before leaving. Use redacted identifiers and never
          paste passwords or tokens.
        </p>
      </div>
      <div className="workbench-grid">
        <div>
          <div className="workbench-fields">
            {fields.map(([key, label, placeholder]) => (
              <label key={key} htmlFor={`note-${key}`}>
                {label}
                <input
                  id={`note-${key}`}
                  value={values[key] || ""}
                  placeholder={placeholder}
                  maxLength={250}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <label htmlFor="note-outcome">
            What does the Conditional Access record show?
            <select
              id="note-outcome"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as Outcome)}
            >
              <option value="unknown">Not yet inspected</option>
              <option value="failure">Failure</option>
              <option value="success">Success</option>
              <option value="notApplied">Not applied</option>
              <option value="reportOnly">Report-only result</option>
            </select>
          </label>
          <label htmlFor="note-evidence">
            Observed evidence
            <textarea
              id="note-evidence"
              rows={5}
              maxLength={6000}
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="Policy names, conditions, exact result, and what changed. Separate observation from assumption."
            />
          </label>
          <div className="workbench-actions">
            <button type="button" onClick={download} className="journal-button">
              Download note ↓
            </button>
            <button
              type="button"
              className="journal-text-link"
              onClick={() => {
                setValues({});
                setEvidence("");
                setOutcome("unknown");
                setStatus("Fields cleared.");
              }}
            >
              Clear fields
            </button>
          </div>
          <p role="status" className="text-sm mt-3">
            {status}
          </p>
        </div>
        <aside className="note-preview">
          <p className="eyebrow">Next investigation step</p>
          <p>{outcomes[outcome]}</p>
          <details>
            <summary>Preview the full handover note</summary>
            <pre>{summary}</pre>
          </details>
          <p className="workbench-source">
            Based on{" "}
            <a href="https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access">
              Microsoft’s Conditional Access troubleshooting guidance
            </a>
            . This tool organises evidence; it does not connect to your tenant
            or determine the cause.
          </p>
        </aside>
      </div>
    </section>
  );
}
