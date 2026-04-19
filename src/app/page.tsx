import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import SearchablePosts from "@/app/_components/searchable-posts";
import { getAllPosts } from "@/lib/api";

export default async function Index() {
  const allPosts = getAllPosts();

  return (
    <main className="relative overflow-hidden">
      <Header />

      <Container>
        {allPosts.length > 0 && <SearchablePosts posts={allPosts} />}
      </Container>
    </main>
  );
}
