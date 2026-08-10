import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { C } from '../components/stories/storyTheme';

export default function TermsOfService() {
  return (
    <div className="font-body min-h-screen w-full flex flex-col relative isolate overflow-hidden" style={{ background: C.bg0, color: C.ink }}>
      {/* ambient background */}
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50 z-0" />
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[640px] w-[1000px] rounded-[50%] z-0"
        style={{ background: `radial-gradient(closest-side, rgba(45,212,191,0.08), transparent 75%)`, filter: 'blur(4px)' }}
      />

      {/* Header */}
      <header className="relative z-10 p-6 sm:p-10 flex items-center justify-between border-b" style={{ borderColor: C.hair }}>
        <Link to="/" className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity">
          <ArrowLeft size={16} style={{ color: C.inkDim }} />
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: C.inkDim }}>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <FileText size={18} style={{ color: C.teal }} />
          <span className="font-display font-bold tracking-tight text-lg">Terms of Service</span>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto p-6 sm:p-10 pb-20 overflow-y-auto">
        <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: C.inkDim }}>
          
          <section className="mb-12">
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2" style={{ color: C.ink }}>Terms of Service</h1>
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.teal }}>Last Updated: August 10, 2026</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Precept ("the Service"), you agree to be bound by these Terms of Service. Precept is a self-hostable web application designed to help software engineers prepare for interviews and manage their job hunt. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>2. User Accounts & Responsibilities</h2>
            <p>
              To use the Service, you must create an account providing your email address, first name, and last name. You are responsible for maintaining the security of your account and your authentication tokens. Authentication is managed via secure JWT tokens, refresh token rotation, and HttpOnly cookies. You must not share your account credentials with others.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>3. Data Ownership & User-Generated Content</h2>
            <p>
              All data you submit to the Service—including technical stories, behavioral narratives (STAR method), job applications, skills, and job descriptions—remains entirely your property. You retain all rights to your user-generated content. We do not claim ownership over any information you store in your command center.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>4. Data Export & Portability</h2>
            <p>
              We believe in zero lock-in. You can export all your personal data and user-generated content as a JSON file at any time via the dashboard export endpoint. 
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>5. Email Communications</h2>
            <p>
              By default, the platform sends daily digest emails containing follow-up reminders and scheduled story reviews based on your activity. You can opt out of these emails at any time by updating your preferences in the Settings page.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>6. Public Testimonials</h2>
            <p>
              If you submit a testimonial through the platform, you grant us permission to display it publicly on the Precept landing page. You may request the removal of your testimonial at any time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>7. Termination & Account Deletion</h2>
            <p>
              You may delete your account at any time via the Settings page. Initiating account deletion will permanently purge all your personal data, stories, applications, and settings from our active databases. We reserve the right to terminate or suspend access to the Service for violations of these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>8. Open Source & Self-Hosting</h2>
            <p>
              Precept's source code is provided under the MIT License. You are free to self-host, modify, and distribute the software in accordance with that license. When you use this hosted instance of Precept, you are using it "as-is."
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>9. Disclaimer of Warranties</h2>
            <p>
              This Service is a personal project, not a commercial SaaS. It is provided on an "AS IS" and "AS AVAILABLE" basis. We expressly disclaim any warranties, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>10. Limitation of Liability</h2>
            <p>
              Under no circumstances shall the creators, contributors, or operators of Precept be liable for any direct, indirect, incidental, special, or consequential damages. We hold no liability for lost job opportunities, interview outcomes, data loss, or server downtime resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold mb-3" style={{ color: C.ink }}>12. Contact Information</h2>
            <p>
              For questions regarding these Terms or the Service, please contact the repository maintainer via GitHub Issues on the Precept repository.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
