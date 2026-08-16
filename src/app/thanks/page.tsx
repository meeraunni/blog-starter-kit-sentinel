import Header from "@/app/_components/header";
import Link from "next/link";

export const metadata = {
  title: "Thanks",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<{
    form?: string;
    status?: string;
  }>;
};

function getCopy(form: string | undefined, status: string | undefined) {
  const isError = status === "error";
  if (form === "assessment") {
    return isError
      ? {
          heading: "We could not send your request yet.",
          body: "Please try again shortly. If this continues, our email gateway is being updated — email info@sentinelidentity.ca directly.",
        }
      : {
          heading: "Your request has been sent.",
          body: "We received your tenant assessment inquiry and will reply within two business days.",
        };
  }

  if (form === "contact") {
    return isError
      ? {
          heading: "We could not send your message.",
          body: "Please try again, or email us directly at info@sentinelidentity.ca.",
        }
      : {
          heading: "Your message has been sent.",
          body: "Thank you for reaching out. Replies typically arrive within two business days.",
        };
  }

  if (status === "confirmed") {
    return { heading: "Your subscription is confirmed.", body: "You will receive an email when a new Sentinel Identity article is published." };
  }

  return isError
    ? {
        heading: "We could not complete your subscription yet.",
        body: "Please try again shortly. If this continues, email info@sentinelidentity.ca and we will add you manually.",
      }
    : {
        heading: "Your subscription request has been sent.",
        body: "We received your request to subscribe to blog updates. Check your inbox for confirmation.",
      };
}

export default async function ThanksPage({ searchParams }: Props) {
  const params = await searchParams;
  const isError = params.status === "error";
  const copy = getCopy(params.form, params.status);

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
          {isError ? "Something went wrong" : "Thank you"}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{copy.heading}</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">{copy.body}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900"
        >
          Back to blog
        </Link>
      </section>
    </main>
  );
}
