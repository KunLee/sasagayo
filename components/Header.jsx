import Link from 'next/link';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link className="site-header__brand" href="/">
          Static Web App
        </Link>

        <nav className="site-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
