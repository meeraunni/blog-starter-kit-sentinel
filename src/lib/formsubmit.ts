const FORM_ENDPOINT = "https://formsubmit.co/info@sentinelidentity.ca";

type SubmissionField = string | undefined;

export async function sendFormSubmission(
  values: Record<string, SubmissionField>,
) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      body.append(key, value.trim());
    }
  }

  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Form delivery failed");
  }
}
