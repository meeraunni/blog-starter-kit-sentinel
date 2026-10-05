import Image from "next/image";

type Scene =
  | "directory"
  | "certificate"
  | "secret"
  | "consent"
  | "redirect"
  | "app"
  | "phone"
  | "roles"
  | "sync"
  | "graph"
  | "calendar"
  | "workflow"
  | "policy";
type Artwork = {
  scene: Scene;
  label: string;
  detail: string;
  color: string;
  background: string;
};

const styles = {
  directory: ["#285c82", "#e7eff5"],
  certificate: ["#715440", "#f3eadc"],
  secret: ["#56558a", "#ecebf5"],
  consent: ["#276958", "#e4efe8"],
  redirect: ["#a3523b", "#f7e9e0"],
  app: ["#365b94", "#e7edf8"],
  phone: ["#75517e", "#f1e7f2"],
  roles: ["#846021", "#f5eedc"],
  sync: ["#236b72", "#e2eff0"],
  graph: ["#335c85", "#e5eef7"],
  calendar: ["#9a514a", "#f4e7e4"],
  workflow: ["#496644", "#eaf0e3"],
  policy: ["#4b626f", "#e8eef0"],
} as const;

// Editorial diagrams, not screenshots or evidence of a tenant configuration.
function getArtwork(slug: string, topic: string): Artwork {
  const code = slug.match(/^aadsts(\d+)/)?.[1];
  const errors: Record<string, [Scene, string, string]> = {
    "50011": ["redirect", "Redirect URI", "Request → reply URL"],
    "50034": ["directory", "Account lookup", "User → tenant directory"],
    "50076": ["phone", "MFA challenge", "Password + another factor"],
    "50105": ["roles", "App assignment", "User → application access"],
    "65001": ["consent", "App consent", "Requested permissions"],
    "700016": ["app", "Application lookup", "App ID → target tenant"],
    "7000215": ["secret", "Client secret", "Credential value & expiry"],
    "700027": ["certificate", "Client assertion", "Certificate → signed JWT"],
  };
  const rules: [RegExp, Scene, string, string][] = [
    [/calendar/, "calendar", "Calendar sharing", "Availability across tenants"],
    [
      /cba|certificate/,
      "certificate",
      "Certificate authentication",
      "Trust chain & CA scope",
    ],
    [
      /secret|password-change/,
      "secret",
      "Credentials",
      "Password & credential lifecycle",
    ],
    [
      /consent|permissions-management|access-packages/,
      "consent",
      "Permissions & access",
      "Request, review, grant",
    ],
    [
      /passkey|fido|passwordless/,
      "phone",
      "Passwordless sign-in",
      "Device → identity provider",
    ],
    [
      /mfa|authenticator|authentication|sms-voice|security-questions/,
      "phone",
      "Authentication methods",
      "Registration & sign-in",
    ],
    [
      /pim|role|responder|emergency-access/,
      "roles",
      "Administrative access",
      "Roles, scope & activation",
    ],
    [
      /sync|provision|active-directory|connect-/,
      "sync",
      "Directory synchronization",
      "Source → target directory",
    ],
    [
      /graph|extension|nested|memberof|recommendations/,
      "graph",
      "Microsoft Graph",
      "Objects & relationships",
    ],
    [
      /lifecycle|sponsor|orphan|cleanup/,
      "workflow",
      "Identity lifecycle",
      "Join, review, retire",
    ],
    [
      /gallery|app-|agent|service-principal|mcp/,
      "app",
      "Application identities",
      "Apps, agents & credentials",
    ],
    [
      /branding|css|csp|saml|sso/,
      "redirect",
      "Sign-in experience",
      "Browser → identity provider",
    ],
    [
      /guest|external-id|username|tenant-governance/,
      "directory",
      "Tenant identities",
      "Users, guests & directories",
    ],
    [
      /review|license|insights/,
      "workflow",
      "Access governance",
      "Inventory & review",
    ],
  ];
  const match = rules.find(([pattern]) => pattern.test(slug));
  const [scene, label, detail] =
    (code && errors[code]) ||
    (match
      ? (match.slice(1) as [Scene, string, string])
      : ([
          "policy",
          "Access policies",
          topic || "Conditions & controls",
        ] as const));
  return {
    scene,
    label: code ? `AADSTS${code}` : label,
    detail: code ? label : detail,
    color: styles[scene][0],
    background: styles[scene][1],
  };
}

function Illustration({ scene }: { scene: Scene }) {
  const paper = { fill: "#fff", stroke: "currentColor", strokeWidth: 1.5 };
  const line = {
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (scene) {
    case "directory":
      return (
        <>
          <rect x="30" y="21" width="142" height="111" rx="8" {...paper} />
          {[47, 76, 105].map((y, i) => (
            <g key={y} opacity={i === 1 ? 1 : 0.35}>
              <circle cx="49" cy={y} r="7" fill="currentColor" />
              <path d={`M67 ${y - 3}h72m-72 7h46`} {...line} />
            </g>
          ))}
          <circle
            cx="171"
            cy="98"
            r="28"
            fill="#fff"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path d="m192 119 20 21M160 98h22" {...line} />
        </>
      );
    case "certificate":
      return (
        <>
          <path d="M45 19h89l26 26v97H45z" {...paper} />
          <path d="M134 19v26h26M63 61h71M63 73h47" fill="none" {...line} />
          <circle cx="99" cy="103" r="17" fill="currentColor" opacity=".18" />
          <path
            d="m87 115-4 23 16-8 16 8-4-23M92 103l5 5 11-12"
            fill="none"
            {...line}
          />
          <rect
            x="144"
            y="70"
            width="74"
            height="41"
            rx="7"
            fill="currentColor"
          />
          <text
            x="181"
            y="97"
            fill="white"
            textAnchor="middle"
            fontSize="20"
            fontFamily="monospace"
          >
            JWT
          </text>
        </>
      );
    case "secret":
      return (
        <>
          <rect x="22" y="45" width="191" height="77" rx="10" {...paper} />
          <path d="M22 70h191" {...line} opacity=".3" />
          <circle cx="37" cy="58" r="3" fill="currentColor" />
          <circle cx="48" cy="58" r="3" fill="currentColor" opacity=".4" />
          <text
            x="38"
            y="104"
            fill="currentColor"
            fontFamily="monospace"
            fontSize="25"
          >
            ••••••••
          </text>
          <circle cx="174" cy="34" r="16" fill="currentColor" />
          <path d="m162 46-22 22m6-6 7 7m0-14 7 7" {...line} strokeWidth="6" />
        </>
      );
    case "consent":
      return (
        <>
          <rect x="43" y="15" width="150" height="132" rx="9" {...paper} />
          <path d="M60 36h67" {...line} />
          {[59, 82, 105].map((y, i) => (
            <g key={y}>
              <rect
                x="60"
                y={y - 8}
                width="13"
                height="13"
                rx="3"
                fill="currentColor"
                opacity={i === 2 ? 0.2 : 1}
              />
              <path
                d={`M84 ${y - 1}h${i === 1 ? 72 : 52}`}
                {...line}
                opacity=".4"
              />
              {i < 2 && (
                <path
                  d={`m63 ${y - 2} 3 3 4-5`}
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                />
              )}
            </g>
          ))}
          <rect
            x="121"
            y="121"
            width="56"
            height="13"
            rx="6"
            fill="currentColor"
          />
        </>
      );
    case "phone":
      return (
        <>
          <rect x="91" y="12" width="77" height="138" rx="13" {...paper} />
          <path d="M115 24h29M120 138h18" {...line} />
          <circle cx="130" cy="70" r="21" fill="currentColor" opacity=".15" />
          <path d="m118 70 8 8 17-18" {...line} fill="none" />
          <rect
            x="27"
            y="91"
            width="110"
            height="32"
            rx="6"
            fill="currentColor"
          />
          <text
            x="82"
            y="112"
            fontFamily="monospace"
            fontSize="17"
            textAnchor="middle"
            fill="white"
          >
            • • • • • •
          </text>
          <path
            d="M181 52q27 16 0 32m9-43q41 26 0 54"
            {...line}
            opacity=".4"
            fill="none"
          />
        </>
      );
    case "roles":
      return (
        <>
          <rect x="95" y="21" width="111" height="116" rx="7" {...paper} />
          <path
            d="M112 43h55M112 61h74M145 87h38M145 103h27"
            {...line}
            opacity=".4"
          />
          <circle cx="65" cy="64" r="20" fill="currentColor" />
          <path
            d="M29 124v-12a36 36 0 0 1 72 0v12"
            fill="currentColor"
            opacity=".25"
          />
          <path d="M88 95h48m-12-12 12 12-12 12" {...line} fill="none" />
        </>
      );
    case "sync":
      return (
        <>
          {[25, 150].map((x) => (
            <g key={x}>
              <rect x={x} y="40" width="65" height="86" rx="7" {...paper} />
              {[59, 82, 105].map((y) => (
                <g key={y}>
                  <path d={`M${x + 13} ${y}h26`} {...line} />
                  <circle cx={x + 50} cy={y} r="3" fill="currentColor" />
                </g>
              ))}
            </g>
          ))}
          <path
            d="M69 26q65-34 107 0m-3-14 3 14-15 1M170 141q-65 33-107 0m3 14-3-14 15-1"
            {...line}
            fill="none"
          />
        </>
      );
    case "graph":
      return (
        <>
          <path
            d="m57 79 112-43M57 79l112 48M57 79h124"
            {...line}
            opacity=".55"
          />
          <rect
            x="26"
            y="55"
            width="55"
            height="49"
            rx="10"
            fill="currentColor"
          />
          <text
            x="54"
            y="86"
            textAnchor="middle"
            fontSize="23"
            fill="white"
            fontFamily="monospace"
          >{`{ }`}</text>
          {[36, 81, 126].map((y, i) => (
            <g key={y}>
              <circle cx={i === 1 ? 187 : 169} cy={y} r="17" {...paper} />
              <circle
                cx={i === 1 ? 187 : 169}
                cy={y}
                r="5"
                fill="currentColor"
              />
            </g>
          ))}
        </>
      );
    case "calendar":
      return (
        <>
          {[25, 132].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y={28 + i * 17}
                width="81"
                height="94"
                rx="7"
                {...paper}
              />
              <path
                d={`M${x} ${51 + i * 17}h81M${x + 20} ${20 + i * 17}v17m40-17v17`}
                {...line}
              />
              {[0, 1, 2].map((n) => (
                <rect
                  key={n}
                  x={x + 14 + n * 20}
                  y={66 + i * 17}
                  width="12"
                  height="12"
                  rx="2"
                  fill="currentColor"
                  opacity=".3"
                />
              ))}
            </g>
          ))}
          <path d="M88 108h66m-11-10 11 10-11 10" {...line} fill="none" />
        </>
      );
    case "workflow":
      return (
        <>
          <path d="M59 46h118v71H59" {...line} fill="none" opacity=".5" />
          {[
            [59, 46],
            [177, 46],
            [59, 117],
          ].map(([x, y], i) => (
            <g key={x + y}>
              <rect
                x={x - 23}
                y={y - 20}
                width="46"
                height="40"
                rx="8"
                {...paper}
              />
              <text
                x={x}
                y={y + 6}
                textAnchor="middle"
                fontSize="18"
                fill="currentColor"
                fontFamily="monospace"
              >
                0{i + 1}
              </text>
            </g>
          ))}
          <circle cx="177" cy="117" r="20" fill="currentColor" />
          <path
            d="m167 117 7 7 13-15"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
        </>
      );
    case "redirect":
      return (
        <>
          <rect x="20" y="25" width="139" height="89" rx="7" {...paper} />
          <path
            d="M20 46h139M34 35h4m8 0h4M40 69h77M40 83h45"
            {...line}
            opacity=".5"
          />
          <rect
            x="124"
            y="83"
            width="96"
            height="52"
            rx="6"
            fill="currentColor"
          />
          <text
            x="172"
            y="115"
            textAnchor="middle"
            fill="white"
            fontSize="20"
            fontFamily="monospace"
          >
            /auth
          </text>
          <path d="M179 38h21v30m-10-10 10 10 10-10" {...line} fill="none" />
        </>
      );
    case "app":
      return (
        <>
          {[
            [31, 30],
            [99, 30],
            [31, 98],
          ].map(([x, y]) => (
            <rect
              key={x + y * 10}
              x={x}
              y={y}
              width="49"
              height="49"
              rx="10"
              {...paper}
            />
          ))}
          <rect
            x="99"
            y="98"
            width="49"
            height="49"
            rx="10"
            fill="currentColor"
          />
          <path d="M157 58h33v65h-30m11-11-11 11 11 11" {...line} fill="none" />
          <circle cx="56" cy="55" r="9" fill="currentColor" opacity=".4" />
        </>
      );
    default:
      return (
        <>
          <rect x="37" y="23" width="164" height="115" rx="9" {...paper} />
          {[51, 81, 111].map((y, i) => (
            <g key={y}>
              <path d={`M54 ${y}h130`} {...line} opacity=".25" />
              <circle
                cx={[98, 155, 119][i]}
                cy={y}
                r="10"
                fill="currentColor"
              />
              <circle cx={[98, 155, 119][i]} cy={y} r="3" fill="white" />
            </g>
          ))}
        </>
      );
  }
}

export default function ArticleArtwork({
  slug,
  topics,
  coverImage,
}: {
  slug: string;
  topics: string[];
  coverImage?: string;
}) {
  if (coverImage?.endsWith(".svg"))
    return (
      <div className="card-technical">
        <Image
          src={coverImage}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 600px) 100vw, 420px"
        />
        <span className="art-caption">
          Technical diagram · open article to explore
        </span>
      </div>
    );
  const art = getArtwork(slug, topics[0]);
  return (
    <div
      className={`article-illustration illustration-${art.scene}${slug.startsWith("aadsts") ? " illustration-error" : ""}`}
      style={{ color: art.color, backgroundColor: art.background }}
      aria-hidden="true"
    >
      <div className="illustration-copy">
        <span className="illustration-eyebrow">
          {slug.startsWith("aadsts")
            ? "Sign-in troubleshooting"
            : "Microsoft Entra"}
        </span>
        <strong>{art.label}</strong>
        <span className="illustration-detail">{art.detail}</span>
      </div>
      <svg viewBox="0 0 240 165" fill="none">
        <Illustration scene={art.scene} />
      </svg>
    </div>
  );
}
