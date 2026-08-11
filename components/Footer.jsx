export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <p>&copy; {year} Static Web App — built with Next.js.</p>
      </div>
    </footer>
  );
}
