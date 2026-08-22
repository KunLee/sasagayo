import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_THEME_COLOR,
  SITE_TITLE_TEMPLATE,
} from '../lib/site';
import './globals.css';

export const metadata = {
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: SITE_TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  manifest: '/site.webmanifest',
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

export const viewport = {
  themeColor: SITE_THEME_COLOR,
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
