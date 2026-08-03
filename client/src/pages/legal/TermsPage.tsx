import { LegalPageLayout } from './LegalPageLayout'

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms &amp; Conditions" updated="3 August 2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          These Terms &amp; Conditions ("Terms") govern your use of the MaidAutos website, mobile experience,
          and booking services (together, the "Service"), operated by Maid Autos Limited ("MaidAutos", "we",
          "us"). By creating an account, searching for trips, or booking a ticket, you agree to these Terms.
          If you do not agree, please do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. Bookings and Tickets</h2>
        <ul>
          <li>A booking is only confirmed once payment has been successfully processed and an e-ticket is issued.</li>
          <li>You are responsible for ensuring the accuracy of passenger details, travel dates, and pickup/dropoff stops at the time of booking.</li>
          <li>Tickets are non-transferable unless MaidAutos agrees otherwise in writing.</li>
          <li>Seat availability is confirmed at the point of payment and is not guaranteed until then.</li>
        </ul>
      </section>

      <section>
        <h2>3. Payments</h2>
        <p>
          Payments are processed securely through our third-party payment partner (Paystack). MaidAutos does
          not store your full card or bank details. All prices are displayed in Nigerian Naira (₦) and are
          inclusive of applicable fees unless stated otherwise.
        </p>
      </section>

      <section>
        <h2>4. Cancellations, Changes &amp; Refunds</h2>
        <ul>
          <li>Cancellation requests must be made through your account or by contacting support before the scheduled departure time.</li>
          <li>Refund eligibility depends on how far in advance a cancellation is requested and the fare type purchased.</li>
          <li>Trips cancelled or significantly delayed by MaidAutos (e.g. due to vehicle breakdown or safety concerns) will be eligible for a full refund or free rebooking, at the passenger's choice.</li>
          <li>No-shows are not eligible for a refund.</li>
        </ul>
      </section>

      <section>
        <h2>5. Passenger Conduct &amp; Safety</h2>
        <p>
          Passengers are expected to arrive at the boarding stop at least 15 minutes before departure and to
          follow the reasonable instructions of drivers and terminal staff. MaidAutos reserves the right to
          refuse boarding or service to any passenger who poses a safety risk, is intoxicated, or engages in
          abusive or disruptive behaviour.
        </p>
      </section>

      <section>
        <h2>6. Luggage</h2>
        <p>
          Passengers may travel with reasonable personal luggage as indicated at the time of booking. MaidAutos
          is not liable for cash, jewellery, electronics, or other valuables carried in luggage. Prohibited,
          illegal, or hazardous items are not permitted on board under any circumstance.
        </p>
      </section>

      <section>
        <h2>7. Liability</h2>
        <p>
          While MaidAutos takes extensive safety precautions — including vehicle inspections, GPS tracking, and
          driver vetting — travel by road carries inherent risk. To the fullest extent permitted by Nigerian
          law, MaidAutos' liability for indirect or consequential loss arising from delays, missed connections,
          or schedule changes is limited to the value of the affected ticket, except where such limitation is
          not permitted by law.
        </p>
      </section>

      <section>
        <h2>8. Account Responsibilities</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account. Notify us immediately if you suspect unauthorized use of
          your account.
        </p>
      </section>

      <section>
        <h2>9. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time to reflect changes in our Service or legal requirements.
          Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from
          these Terms or use of the Service shall be subject to the exclusive jurisdiction of the courts of
          Nigeria.
        </p>
      </section>

      <section>
        <h2>11. Contact Us</h2>
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:maidautosolutions@gmail.com" className="text-primary font-semibold hover:underline">
            maidautosolutions@gmail.com
          </a>{' '}
          or by phone on 0912 222 2656 / 0912 222 2856.
        </p>
      </section>
    </LegalPageLayout>
  )
}
