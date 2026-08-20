import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  TITLE_TEMPLATE,
} from '../lib/site';
import './globals.css';

export const metadata = {
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  appleWebApp: {
    title: SITE_NAME,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
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
