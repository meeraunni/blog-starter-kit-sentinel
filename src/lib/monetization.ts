function getOptionalHttpsUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getMonetizationLinks() {
  return {
    troubleshootingCheckout: getOptionalHttpsUrl(
      process.env.NEXT_PUBLIC_TROUBLESHOOTING_CHECKOUT_URL,
    ),
    toolkitCheckout: getOptionalHttpsUrl(
      process.env.NEXT_PUBLIC_TOOLKIT_CHECKOUT_URL,
    ),
    support: getOptionalHttpsUrl(process.env.NEXT_PUBLIC_SUPPORT_URL),
  };
}
