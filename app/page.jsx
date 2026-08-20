import Image from 'next/image';
import Link from 'next/link';
import { SITE_NAME } from '../lib/site';

export default function HomePage() {
  return (
    <article className="stack">
      <Image
        className="logo"
        src="/logo.svg"
        alt={`${SITE_NAME} logo`}
        width={96}
        height={96}
        priority
      />

      <h1>{SITE_NAME}</h1>

      <p className="lead">
        {SITE_NAME} is a minimal Next.js site configured for static export.
        Every route is pre-rendered to plain HTML at build time, so the site can
        be served from any static host.
      </p>

      <p>
        Routing uses the App Router: each folder under <code>app/</code> that
        contains a <code>page.jsx</code> becomes a route. Add a new folder to
        add a new page.
      </p>

      <p>
        <Link className="button" href="/about">
          Go to the About page
        </Link>
      </p>
    </article>
  );
}
