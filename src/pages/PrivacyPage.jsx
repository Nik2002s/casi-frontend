// CASI — Privacy Policy  (version 2026-05-07)
// Standalone page, accessible without auth at /privacy

export default function PrivacyPage({ inline = false }) {
  return (
    <div style={inline ? {} : { background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      {!inline && (
        <div className="max-w-3xl mx-auto pt-16 px-6 mb-8">
          <a href="/" className="text-sm" style={{ color: 'var(--accent)' }}>← Back to CASI</a>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-6 pb-16 space-y-6 text-[13px] leading-relaxed" style={{ color: 'var(--text)' }}>
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-strong)' }}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-dim)' }}>Version 2026-05-07 · Effective immediately upon acceptance</p>
        </div>

        <Section title="1. Who We Are">
          CASI ("we", "our", "us") operates the CASI quality analytics platform available at
          casi-64bdd.web.app. This policy explains how we collect, use, and protect your data.
        </Section>

        <Section title="2. Data We Collect">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong style={{ color: 'var(--text-strong)' }}>Account data:</strong> your Google account email and display name, obtained via Google Sign-In (Firebase Authentication).</li>
            <li><strong style={{ color: 'var(--text-strong)' }}>Test data:</strong> QA test-suite files and results you upload to the Service.</li>
            <li><strong style={{ color: 'var(--text-strong)' }}>Usage data:</strong> AI token usage, API request counts, and timestamps of actions within the Service.</li>
            <li><strong style={{ color: 'var(--text-strong)' }}>Acceptance records:</strong> the date and version number when you accepted these policies.</li>
            <li><strong style={{ color: 'var(--text-strong)' }}>Communication data:</strong> name, email, company, and message if you submit an enterprise enquiry form.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>To provide and operate the Service — compute scores, store results, serve the dashboard.</li>
            <li>To enforce access control and rate limits.</li>
            <li>To generate AI-powered diagnostics using your uploaded test data.</li>
            <li>To respond to enterprise or support enquiries.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          We do not use your data for advertising or sell it to third parties.
        </Section>

        <Section title="4. AI Processing">
          When you use AI chat or diagnostic features, your uploaded test data and conversation messages
          are sent to a third-party AI provider (Anthropic Claude) solely to generate a response.
          Anthropic's data handling is governed by their own privacy policy. We do not permit Anthropic
          to use your data to train their models under our API agreement.
        </Section>

        <Section title="5. Data Storage and Security">
          Your data is stored in a PostgreSQL database hosted on Railway. We use TLS in transit and
          enforce row-level access controls so users can only access their own project data. Passwords
          are never stored — authentication is delegated entirely to Google via Firebase.
        </Section>

        <Section title="6. Data Retention">
          We retain your account and project data for as long as your account is active. You may
          request deletion of your account and all associated data by contacting us. Upload files are
          stored until the associated project is deleted.
        </Section>

        <Section title="7. Sharing and Disclosure">
          We do not sell or rent your personal data. We may disclose data:
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>To service providers who operate infrastructure on our behalf (Railway, Firebase, Anthropic) under contractual data-protection obligations.</li>
            <li>When required by law, court order, or to protect the rights and safety of CASI or others.</li>
          </ul>
        </Section>

        <Section title="8. Your Rights">
          You have the right to:
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Object to or restrict certain processing activities.</li>
          </ul>
          To exercise these rights, contact us via the enterprise form on the CASI website.
        </Section>

        <Section title="9. Cookies">
          The CASI web application uses browser localStorage solely to remember your UI preferences
          (theme, accent colour). We do not use tracking cookies or third-party analytics cookies.
          Firebase Authentication may set session cookies necessary for authentication only.
        </Section>

        <Section title="10. Children's Privacy">
          The Service is not directed at or intended for use by persons under the age of 18. We do not
          knowingly collect personal data from children.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this policy periodically. When the policy changes materially, we will
          increment the version date and require you to re-accept before continuing to use the Service.
        </Section>

        <Section title="12. Contact">
          For privacy enquiries or to exercise your data rights, contact us via the enterprise form on
          the CASI website.
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-[14px] font-semibold mb-1.5" style={{ color: 'var(--text-strong)' }}>{title}</h2>
      <div style={{ color: 'var(--text-muted)' }}>{children}</div>
    </div>
  )
}
