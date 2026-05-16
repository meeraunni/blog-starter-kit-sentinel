import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sentinel Identity — Microsoft Entra & Microsoft 365 Reference";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(circle at 18% -10%, rgba(8,145,178,0.35), transparent 45%), radial-gradient(circle at 110% 110%, rgba(15,23,42,0.35), transparent 45%), linear-gradient(180deg, #0b1220 0%, #0f172a 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#020617",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              letterSpacing: 6,
              fontSize: 22,
            }}
          >
            SI
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Sentinel Identity</span>
            <span style={{ fontSize: 16, color: "#67e8f9", letterSpacing: 6, textTransform: "uppercase" }}>
              Microsoft Entra · M365 Reference
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 16,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#67e8f9",
            }}
          >
            Engineering-grade reference
          </span>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              margin: 0,
            }}
          >
            Microsoft Entra &amp;
            <br />
            Microsoft 365.
          </h1>
          <p style={{ fontSize: 30, color: "#cbd5e1", margin: 0, maxWidth: 920, lineHeight: 1.35 }}>
            Long-form troubleshooting and architecture for the people who run Microsoft identity.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 22, color: "#94a3b8" }}>sentinelidentity.ca</span>
          <span
            style={{
              fontSize: 18,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(8,145,178,0.18)",
              color: "#67e8f9",
              border: "1px solid rgba(103,232,249,0.4)",
            }}
          >
            Conditional Access · Passkeys · Hybrid · DNS
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
