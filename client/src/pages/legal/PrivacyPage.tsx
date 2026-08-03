import { LegalPageLayout } from './LegalPageLayout'

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="3 August 2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy explains how Maid Autos Limited ("MaidAutos", "we", "us") collects, uses, and
          protects your personal information when you use our website, account, and booking services (the
          "Service").
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <ul>
          <li><strong>Account information:</strong> name, email address, phone number, and password.</li>
          <li><strong>Booking information:</strong> travel dates, routes, pickup/dropoff stops, and passenger details for each trip.</li>
          <li><strong>Payment information:</strong> transaction records and payment status. Full card details are handled directly by our payment processor (Paystack) and are never stored on our servers.</li>
          <li><strong>Usage information:</strong> device type, browser, and general usage patterns to help us improve the Service.</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To process bookings, issue e-tickets, and manage your trips.</li>
          <li>To send booking confirmations, trip reminders, and important service updates.</li>
          <li>To provide customer support and respond to enquiries.</li>
          <li>To improve the safety, reliability, and performance of our Service.</li>
          <li>To meet legal, regulatory, and fraud-prevention obligations.</li>
        </ul>
      </section>

      <section>
        <h2>4. Sharing Your Information</h2>
        <p>
          We do not sell your personal information. We share information only where necessary to operate the
          Service:
        </p>
        <ul>
          <li>With our payment processor (Paystack) to process transactions securely.</li>
          <li>With drivers and terminal staff, limited to the details needed to identify passengers and manage boarding.</li>
          <li>With regulators or law enforcement where required by law.</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>
          We retain your account and booking information for as long as your account is active, and for a
          reasonable period afterwards to meet legal, accounting, and fraud-prevention requirements. You may
          request deletion of your account at any time, subject to these obligations.
        </p>
      </section>

      <section>
        <h2>6. Data Security</h2>
        <p>
          We use industry-standard safeguards — including encrypted connections and access controls — to
          protect your personal information against unauthorized access, loss, or misuse. No method of
          transmission or storage is completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>
          You may access, update, or request deletion of your personal information at any time by contacting
          us or, where available, through your account settings. You may also object to or request that we
          restrict certain uses of your data.
        </p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>
          We use cookies and similar technologies to keep you signed in, remember your preferences, and
          understand how the Service is used. You can control cookies through your browser settings, though
          some features may not work correctly if cookies are disabled.
        </p>
      </section>

      <section>
        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not directed at children under 18. We do not knowingly collect personal information
          from children.
        </p>
      </section>

      <section>
        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated through
          the Service or by email. Continued use of the Service after an update constitutes acceptance of the
          revised policy.
        </p>
      </section>

      <section>
        <h2>11. Contact Us</h2>
        <p>
          For questions about this Privacy Policy or to exercise your data rights, contact us at{' '}
          <a href="mailto:maidautosolutions@gmail.com" className="text-primary font-semibold hover:underline">
            maidautosolutions@gmail.com
          </a>{' '}
          or by phone on 0912 222 2656 / 0912 222 2856.
        </p>
      </section>
    </LegalPageLayout>
  )
}
