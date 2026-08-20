import { SITE_NAME } from '../lib/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          &copy; {year} {SITE_NAME} — built with Next.js.
        </p>
      </div>
    </footer>
  );
}
