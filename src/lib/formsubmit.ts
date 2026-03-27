const FORM_ENDPOINT = "https://formsubmit.co/meeraunni4@gmail.com";

type SubmissionField = string | undefined;

export async function sendFormSubmission(
  values: Record<string, SubmissionField>,
) {
  const payload = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      payload.append(key, value.trim());
    }
  }

  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    throw new Error("Form delivery failed");
  }
}
