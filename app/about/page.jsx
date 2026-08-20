import Link from 'next/link';
import { SITE_NAME } from '../../lib/site';

export const metadata = {
  title: 'About',
  description: `What ${SITE_NAME} contains and how to extend it with additional static pages.`,
};

export default function AboutPage() {
  return (
    <article className="stack">
      <h1>About</h1>

      <p className="lead">
        This second page exists to prove that client-side navigation and the
        shared layout work across routes.
      </p>

      <h2>What is included</h2>
      <ul>
        <li>Next.js App Router with a shared root layout.</li>
        <li>A global stylesheet with a small reset and layout helpers.</li>
        <li>Reusable <code>Header</code> and <code>Footer</code> components.</li>
        <li>Static export configuration (<code>output: &apos;export&apos;</code>).</li>
      </ul>

      <h2>Adding a page</h2>
      <p>
        Create <code>app/&lt;route&gt;/page.jsx</code> and export a default React
        component. The build then emits{' '}
        <code>out/&lt;route&gt;/index.html</code> for it automatically.
      </p>

      <p>
        <Link className="button" href="/">
          Back to the home page
        </Link>
      </p>
    </article>
  );
}
