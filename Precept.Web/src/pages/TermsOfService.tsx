import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Logo } from '../components/ui/kit';

const LAST_UPDATED = 'August 10, 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing and using Precept ("the Service"), you agree to be bound by these Terms of Service. Precept is a self-hostable web application designed to help software engineers prepare for interviews and manage their job hunt. If you do not agree to these terms, please do not use the Service.',
  },
  {
    title: 'User Accounts & Responsibilities',
    body: 'To use the Service, you must create an account providing your email address, first name, and last name. You are responsible for maintaining the security of your account and your authentication tokens. Authentication is managed via secure JWT tokens, refresh token rotation, and HttpOnly cookies. You must not share your account credentials with others.',
  },
  {
    title: 'Data Ownership & User-Generated Content',
    body: 'All data you submit to the Service (including technical stories, behavioral narratives (STAR method), job applications, skills, and job descriptions) remains entirely your property. You retain all rights to your user-generated content. We do not claim ownership over any information you store in your command center.',
  },
  {
    title: 'Data Export & Portability',
    body: 'We believe in zero lock-in. You can export all your personal data and user-generated content as a JSON file at any time via the dashboard export endpoint.',
  },
  {
    title: 'Email Communications',
    body: 'By default, the platform sends daily digest emails containing follow-up reminders and scheduled story reviews based on your activity. You can opt out of these emails at any time by updating your preferences in the Settings page.',
  },
  {
    title: 'Public Testimonials',
    body: 'If you submit a testimonial through the platform, you grant us permission to display it publicly on the Precept landing page. You may request the removal of your testimonial at any time.',
  },
  {
    title: 'Termination & Account Deletion',
    body: 'You may delete your account at any time via the Settings page. Initiating account deletion will permanently purge all your personal data, stories, applications, and settings from our active databases. We reserve the right to terminate or suspend access to the Service for violations of these Terms.',
  },
  {
    title: 'Open Source & Self-Hosting',
    body: 'Precept\'s source code is provided under the MIT License. You are free to self-host, modify, and distribute the software in accordance with that license. When you use this hosted instance of Precept, you are using it "as-is."',
  },
  {
    title: 'Disclaimer of Warranties',
    body: 'This Service is a personal project, not a commercial SaaS. It is provided on an "AS IS" and "AS AVAILABLE" basis. We expressly disclaim any warranties, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Under no circumstances shall the creators, contributors, or operators of Precept be liable for any direct, indirect, incidental, special, or consequential damages. We hold no liability for lost job opportunities, interview outcomes, data loss, or server downtime resulting from your use of the Service.',
  },
  {
    title: 'Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with applicable laws, without regard to its conflict of law provisions.',
  },
  {
    title: 'Contact Information',
    body: 'For questions regarding these Terms or the Service, please contact the repository maintainer via GitHub Issues on the Precept repository.',
  },
];

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service · Precept';
  }, []);

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 md:px-8">
          <Link to="/" aria-label="Precept home">
            <Logo />
          </Link>
          <Button variant="ghost" size="sm" to="/" icon={<ArrowLeft size={15} />}>
            Home
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1120px] px-5 pb-28 pt-16 md:px-8 md:pt-24">
        <h1 className="display-lg text-fg">Terms of Service</h1>
        <p className="mt-4 text-[14px] text-fg-3">Last updated {LAST_UPDATED}</p>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Sections" className="hidden lg:block">
            <ol className="sticky top-28 flex flex-col gap-1 text-[13px]">
              {SECTIONS.map((s, i) => (
                <li key={s.title}>
                  <a
                    href={`#${slug(s.title)}`}
                    className="flex gap-3 rounded-md px-2 py-1.5 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <span className="num w-5 text-fg-3">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ol className="flex max-w-[68ch] flex-col">
            {SECTIONS.map((s, i) => (
              <li key={s.title} id={slug(s.title)} className="scroll-mt-24 border-t border-line py-8 first:border-t-0 first:pt-0">
                <h2 className="flex items-baseline gap-3 text-[19px] font-semibold tracking-[-0.01em] text-fg">
                  <span className="num text-[13px] font-normal text-fg-3">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <p className="mt-3 text-[15.5px] leading-[1.7] text-fg-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
