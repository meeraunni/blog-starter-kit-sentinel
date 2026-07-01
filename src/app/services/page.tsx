import { redirect } from "next/navigation";

export const metadata = {
  title: "Consulting",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServicesPage() {
  redirect("/consulting");
}
