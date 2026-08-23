import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

export const metadata = { title: 'Contact us' };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 sm:px-8 sm:py-28">
      <Link href="/" className="mb-14 inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900">
        <ArrowLeft className="size-4" />
        Back to discover
      </Link>
      <p className="micro-label text-[#a74735]">Contact us</p>
      <h1 className="mt-5 max-w-4xl font-serif text-6xl leading-[.95] tracking-[-.04em] sm:text-8xl">
        We&apos;d love to <em className="font-normal text-[#a74735]">hear</em> from you.
      </h1>
      <div className="mt-14 grid gap-10 border-t border-stone-900/10 pt-10 md:grid-cols-2">
        <p className="text-xl leading-8 text-stone-700">
          Questions, ideas, or a story you want to share? Reach out — a real person reads every message.
        </p>
        <p className="text-sm leading-7 text-stone-500">
          We usually reply within two business days. For press or partnership enquiries, mention it in your
          message so we can route it to the right person.
        </p>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-stone-900/8 bg-white/55 p-6">
          <Mail className="size-5 text-[#a74735]" />
          <p className="mt-10 font-serif text-xl">Email</p>
          <a href="mailto:hello@sasagayo.example" className="mt-2 block text-sm text-stone-500 hover:text-stone-900">
            hello@sasagayo.example
          </a>
        </div>
        <div className="rounded-3xl border border-stone-900/8 bg-white/55 p-6">
          <Phone className="size-5 text-[#a74735]" />
          <p className="mt-10 font-serif text-xl">Phone</p>
          <a href="tel:+81334567890" className="mt-2 block text-sm text-stone-500 hover:text-stone-900">
            +81 3-3456-7890
          </a>
        </div>
        <div className="rounded-3xl border border-stone-900/8 bg-white/55 p-6">
          <MapPin className="size-5 text-[#a74735]" />
          <p className="mt-10 font-serif text-xl">Address</p>
          <address className="mt-2 not-italic text-sm leading-6 text-stone-500">
            3-12 Sasagaya-cho
            <br />
            Suginami-ku, Tokyo 166-0012
            <br />
            Japan
          </address>
        </div>
      </div>
    </div>
  );
}
