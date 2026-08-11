import Header from '../components/Header';
import Footer from '../components/Footer';
import './globals.css';

export const metadata = {
  title: {
    default: 'Static Web App',
    template: '%s | Static Web App',
  },
  description:
    'A minimal static web application scaffold built with Next.js and the App Router.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="site">
          <Header />
          <main className="site-main container">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
