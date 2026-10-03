import Image from "next/image";

// Editorial illustrations only: never presented as product UI or test evidence.
export default function ArticleArtwork({
  slug,
  topics,
  coverImage,
}: {
  slug: string;
  topics: string[];
  coverImage?: string;
}) {
  if (coverImage?.endsWith(".svg")) return (
    <div className="card-technical">
      <Image src={coverImage} alt="" fill unoptimized sizes="(max-width: 600px) 100vw, 420px" />
      <span className="art-caption">Technical diagram · open article to explore</span>
    </div>
  );
  const passkeys = /passkey|fido|authentication-method/.test(slug);
  const infrastructure =
    /dns|active-directory|connect-|domain-controller|cloud-sync/.test(slug);
  if (passkeys || infrastructure)
    return (
      <div className="card-photo">
        <Image
          src={`/assets/editorial/${passkeys ? "passkeys" : "infrastructure"}.webp`}
          alt=""
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1023px) 50vw, 420px"
        />
        <span className="art-caption">
          {passkeys ? "Passwordless" : "Infrastructure"}
        </span>
      </div>
    );
  const graph = /graph|extension|recommendations|nested/.test(slug);
  const agent = /agent/.test(slug);
  const calendar = /calendar|sharing|cross-tenant/.test(slug);
  const theme = agent ? "violet" : calendar ? "coral" : graph ? "blue" : "teal";
  return (
    <div className={`card-art card-art-${theme}`} aria-hidden="true">
      <span className="art-grid" />
      <svg viewBox="0 0 360 180" fill="none">
        {graph ? (
          <>
            <path
              d="M80 90H175M185 90L265 45M185 90L265 135"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="80" cy="90" r="23" fill="currentColor" opacity=".22" />
            <circle cx="80" cy="90" r="10" fill="currentColor" />
            <rect
              x="153"
              y="65"
              width="50"
              height="50"
              rx="12"
              fill="currentColor"
            />
            <circle
              cx="270"
              cy="45"
              r="17"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              cx="270"
              cy="135"
              r="17"
              stroke="currentColor"
              strokeWidth="3"
            />
          </>
        ) : calendar ? (
          <>
            <rect
              x="80"
              y="35"
              width="95"
              height="110"
              rx="10"
              fill="currentColor"
              opacity=".25"
            />
            <rect
              x="187"
              y="35"
              width="95"
              height="110"
              rx="10"
              fill="currentColor"
              opacity=".65"
            />
            <path
              d="M95 64h64M202 64h64M148 93h62m-12-10 12 10-12 10"
              stroke="white"
              strokeWidth="3"
            />
            <path
              d="M105 27v20m45-20v20m61-20v20m45-20v20"
              stroke="currentColor"
              strokeWidth="4"
            />
          </>
        ) : (
          <>
            <circle
              cx="180"
              cy="90"
              r="66"
              stroke="currentColor"
              opacity=".3"
            />
            <circle
              cx="180"
              cy="90"
              r="48"
              stroke="currentColor"
              strokeDasharray="4 6"
            />
            <path
              d="M180 50l31 13v30c0 19-31 36-31 36s-31-17-31-36V63z"
              fill="currentColor"
              opacity=".7"
            />
            <path d="m167 89 9 9 17-19" stroke="white" strokeWidth="4" />
            <circle cx="114" cy="90" r="8" fill="currentColor" />
            <circle cx="246" cy="90" r="8" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="art-caption">
        {graph
          ? "Microsoft Graph"
          : agent
            ? "Agent identity"
            : calendar
              ? "Connected tenants"
              : topics[0] || "Identity operations"}
      </span>
    </div>
  );
}
