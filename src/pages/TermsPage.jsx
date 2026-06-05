// CASI — Terms and Conditions  (version 2026-05-07)
// Standalone page, accessible without auth at /terms

export default function TermsPage({ inline = false }) {
  const wrap = inline
    ? 'prose-sm max-w-none'
    : 'min-h-screen py-16 px-6'

  return (
    <div className={wrap} style={inline ? {} : { background: 'var(--bg)', color: 'var(--text)' }}>
      {!inline && (
        <div className="max-w-3xl mx-auto mb-8">
          <a href="/" className="text-sm" style={{ color: 'var(--accent)' }}>← Back to CASI</a>
        </div>
      )}
      <div className="max-w-3xl mx-auto space-y-6 text-[13px] leading-relaxed" style={{ color: 'var(--text)' }}>
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-strong)' }}>Terms and Conditions</h1>
          <p style={{ color: 'var(--text-dim)' }}>Version 2026-05-07 · Effective immediately upon acceptance</p>
        </div>

        <Section title="1. Acceptance of Terms">
          By creating an account or using CASI ("the Service"), you agree to be bound by these Terms and
          Conditions ("Terms"). If you do not agree, you must not use the Service.
        </Section>

        <Section title="2. Description of Service">
          CASI is a software quality analytics platform that computes release-readiness scores from QA
          test-suite data. The Service is provided on an early-access basis and features may change
          without prior notice.
        </Section>

        <Section title="3. Eligibility">
          You must be at least 18 years old and have the legal authority to enter into these Terms on
          behalf of yourself or your organisation. Access is granted by explicit invitation only.
        </Section>

        <Section title="4. User Accounts">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must notify us immediately of any unauthorised use of your account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          </ul>
        </Section>

        <Section title="5. Acceptable Use">
          You agree not to:
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Upload data you do not have the right to share.</li>
            <li>Attempt to reverse-engineer, scrape, or circumvent any security measures of the Service.</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable regulation.</li>
            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
          </ul>
        </Section>

        <Section title="6. Data and Uploads">
          You retain ownership of test data you upload. By uploading data, you grant CASI a limited,
          non-exclusive licence to process and store that data solely for the purpose of providing the
          Service to you. We do not sell or share your data with third parties except as described in
          the Privacy Policy.
        </Section>

        <Section title="7. AI-Generated Content">
          The Service uses AI models to generate diagnostic reports and recommendations. These outputs
          are informational only. CASI makes no warranty that AI-generated content is accurate,
          complete, or suitable for any specific decision. Release decisions remain the sole
          responsibility of your team.
        </Section>

        <Section title="8. Intellectual Property">
          All software, models, and UI components of the Service are the property of CASI. Nothing in
          these Terms grants you any right to copy, modify, or distribute the Service itself.
        </Section>

        <Section title="9. Disclaimers">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS
          OR IMPLIED, INCLUDING BUT NOT LIMITED TO FITNESS FOR A PARTICULAR PURPOSE OR
          NON-INFRINGEMENT. WE DO NOT WARRANT UNINTERRUPTED OR ERROR-FREE OPERATION.
        </Section>

        <Section title="10. Limitation of Liability">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CASI SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH THE
          SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </Section>

        <Section title="11. Changes to Terms">
          We may update these Terms from time to time. When we do, we will increment the version date
          and require you to re-accept before continuing to use the Service.
        </Section>

        <Section title="12. Governing Law">
          These Terms are governed by and construed in accordance with applicable law. Any disputes
          will be resolved through good-faith negotiation before any formal proceedings.
        </Section>

        <Section title="13. Contact">
          For questions about these Terms, contact us via the enterprise form on the CASI website.
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
