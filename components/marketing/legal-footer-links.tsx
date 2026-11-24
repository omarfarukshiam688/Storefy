import Link from 'next/link';

const links = [
  { href: '/about', label: 'আমাদের সম্পর্কে' },
  { href: '/privacy-policy', label: 'গোপনীয়তা নীতি' },
  { href: '/terms', label: 'ব্যবহারের শর্তাবলি' },
] as const;

export function LegalFooterLinks({
  linkClassName = 'transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
}: {
  linkClassName?: string;
}) {
  return (
    <>
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        </li>
      ))}
    </>
  );
}
