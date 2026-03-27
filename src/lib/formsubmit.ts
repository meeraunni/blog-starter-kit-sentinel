const FORM_ENDPOINT = "https://formsubmit.co/ajax/meeraunni4@gmail.com";

type SubmissionField = string | undefined;

export async function sendFormSubmission(
  values: Record<string, SubmissionField>,
) {
  const payload: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      payload[key] = value.trim();
    }
  }

  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Form delivery failed");
  }

  const result = await response.json();

  if (!result.success || result.success === "false") {
    throw new Error(result.message || "Form delivery failed");
  }
}
