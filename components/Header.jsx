import Link from 'next/link';
import { SITE_NAME } from '../lib/site';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link className="site-header__brand" href="/">
          {SITE_NAME}
        </Link>

        <nav className="site-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
