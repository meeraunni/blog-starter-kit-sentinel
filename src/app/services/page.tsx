import { redirect } from "next/navigation";

export const metadata = {
  title: "Archive",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServicesPage() {
  redirect("/archive");
}
