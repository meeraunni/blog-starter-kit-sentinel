import Link from "next/link";
import { Post } from "@/interfaces/post";
import { getAllTopics, getPostsByTopic } from "@/lib/post-taxonomy";

export default function TopicGrid({ posts }: { posts: Post[] }) {
  const topics = getAllTopics()
    .map((topic) => ({
      ...topic,
      count: getPostsByTopic(posts, topic.slug).length,
    }))
    .filter((topic) => topic.count > 0);
  return (
    <aside className="journal-topics" aria-label="Browse the library">
      <p className="eyebrow">Browse by topic</p>
      <h2>What are you working on?</h2>
      <ul>
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link href={`/topics/${topic.slug}`}>
              <span>{topic.label}</span>
              <span className="topic-count">
                {String(topic.count).padStart(2, "0")}{" "}
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="notebook-note">
        <p className="eyebrow">Free administrator tools</p>
        <h3>Evidence before changes.</h3>
        <p>
          Build a sign-in investigation note and download editable worksheets.
          No account needed.
        </p>
        <Link href="/resources" className="journal-text-link">
          Open the workbench →
        </Link>
      </div>
      <div className="editor-note">
        <p className="eyebrow">Behind Sentinel Identity</p>
        <p>
          Product guidance, examples, and interpretation are different kinds of
          evidence. Our <Link href="/editorial-policy">editorial policy</Link>{" "}
          explains how to read them.
        </p>
        <Link href="/contact">Found something wrong? Let us know ↗</Link>
      </div>
    </aside>
  );
}
