import React from "react";

const Terms = () => {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <section className="space-y-8 leading-relaxed text-gray-700">
      <p>
        Welcome to <strong>Kick Lifestyle</strong>. By accessing or using our
        website, purchasing products, or engaging with our services, you agree
        to the following Terms & Conditions. Please read them carefully.
      </p>

      {/* 1) Warranty Coverage (your provided content) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          1) Warranty Coverage
        </h2>
        <p>
          Kick products are covered by a limited warranty for a period of{" "}
          <strong>one (1) year</strong> (<strong>6 months for battery</strong>)
          from the date of purchase. This warranty covers defects in materials
          and workmanship under normal use. If your product is damaged or
          defective due to manufacturing defects within this warranty period, we
          are here to assist you.
        </p>

        <h3 className="font-medium text-gray-900">Warranty Exclusions</h3>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            Products that have been tampered with or modified by unauthorized
            personnel.
          </li>
          <li>
            Products that show signs of physical damage, including cracks,
            dents, or scratches.
          </li>
          <li>
            Products that have been exposed to liquid damage (immersion in water
            or excessive moisture).
          </li>
          <li>
            After the initial <strong>6 months</strong> from the Date of
            Purchase, any defects in battery life or other battery-related
            issues will no longer be covered under warranty.
          </li>
          <li>
            Please use a <strong>5W charger</strong> for all Kick products.
            Charging with a higher wattage may damage the earbuds or smartwatch
            and <strong>void the warranty</strong>.
          </li>
        </ul>

        <h3 className="font-medium text-gray-900">Warranty Claim Process</h3>
        <ol className="list-decimal ml-6 space-y-2">
          <li>
            Contact our customer care at{" "}
            <a
              href="mailto:customer.care@kick-lifestyle.shop"
              className="text-blue-600 underline"
            >
              customer.care@kick-lifestyle.shop
            </a>{" "}
            or leave a message on{" "}
            <a href="tel:+9779820810020" className="text-blue-600 underline">
              +977-9820810020
            </a>
            . Provide the product model, purchase date, and a brief description
            of the issue.
          </li>
          <li>
            Our team may request additional information or evidence to validate
            the issue and will guide you through the process.
          </li>
          <li>
            If approved, we’ll share return instructions. Ensure secure
            packaging to prevent transit damage.
          </li>
          <li>
            Upon receiving the item, we’ll assess eligibility. If eligible, we
            will <strong>repair or replace</strong> the product at our
            discretion.
          </li>
        </ol>
        <p className="text-sm">
          Note: You are responsible for any shipping costs associated with
          returning the item for warranty service.
        </p>

        <h3 className="font-medium text-gray-900">Limitations of Liability</h3>
        <p>
          Kick’s liability under this warranty is limited to the repair or
          replacement of the product as determined by our technical team. We are
          not liable for any incidental or consequential damages arising from
          the use or misuse of our products. This warranty is valid only for the
          original purchaser and is not transferable.
        </p>
      </div>

      {/* 2) Failed Delivery (your provided content) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          2) Failed Delivery
        </h2>
        <p>
          A delivery attempt that cannot be completed due to reasons
          attributable to the customer, including but not limited to incorrect
          address, absence of recipient, refusal to accept the package, failure
          to comply with delivery instructions, or not picking up calls from
          delivery personnel, will be considered a{" "}
          <strong>failed delivery</strong>.
        </p>

        <h3 className="font-medium text-gray-900">Eligibility</h3>
        <p>
          If the customer does not pick up the call from the delivery personnel,
          it will be considered a failed delivery attempt, and the customer will
          be charged accordingly.
        </p>

        <h3 className="font-medium text-gray-900">Delivery Charges</h3>
        <p>
          In the event of a failed delivery attempt, the customer will be liable
          for any additional delivery charges incurred, including the cost of
          the initial attempt. Charges will be calculated based on standard
          rates shown at the time of order, plus any additional costs arising
          from the failed attempt.
        </p>

        <h3 className="font-medium text-gray-900">
          Notification & Rescheduling
        </h3>
        <p>
          We will notify the customer using the provided contact details. The
          customer may reschedule delivery at an additional cost. Rescheduled
          attempts are subject to the same delivery charge terms.
        </p>

        <h3 className="font-medium text-gray-900">Payment of Extra Charges</h3>
        <p>
          The customer agrees to pay any extra charges resulting from a failed
          delivery attempt. These charges will be added to the customer’s
          account and must be settled before further deliveries. Failure to pay
          may result in order cancellation.
        </p>

        <p className="italic">
          By placing an order, you acknowledge that you have read, understood,
          and agreed to these terms and conditions regarding extra charges on
          failed delivery attempts.
        </p>
      </div>

      {/* Extra sensible terms (added) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          3) Orders, Pricing & Payments
        </h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            Prices may change without prior notice. Obvious pricing errors may
            be corrected, and affected orders may be cancelled with a full
            refund.
          </li>
          <li>
            We reserve the right to refuse or cancel any order due to inventory
            limits, suspected fraud, or inaccurate information.
          </li>
          <li>
            Payments must be completed using the methods offered at checkout. By
            submitting an order, you authorize us to charge the selected payment
            method for the total amount shown.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900">
          4) Shipping & Risk of Loss
        </h2>
        <p>
          Estimated delivery times are indicative. Title and risk of loss pass
          to you upon handover to the carrier or upon successful delivery to the
          address provided, as applicable in your locality.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">
          5) Returns & Replacements
        </h2>
        <p>
          For non-warranty returns, items must be unused and in original
          packaging within the return window stated on the product page or
          invoice. Certain categories (e.g., hygiene-sensitive ear tips) may not
          be eligible once opened. Approved returns may be refunded or replaced
          per our returns policy.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">
          6) Use of Products
        </h2>
        <p>
          Products should be used as intended and per the included safety
          instructions. Using incompatible chargers, accessories, or exposing
          devices to extreme conditions may cause damage and void the warranty.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">
          7) Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, Kick Lifestyle will not be
          liable for any indirect, incidental, special, punitive, or
          consequential damages, or any loss of data, revenue, or profits,
          arising out of or related to your purchase or use of the products.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">
          8) Governing Law & Dispute Resolution
        </h2>
        <p>
          These Terms are governed by the laws of Nepal. Any disputes shall be
          subject to the exclusive jurisdiction of the competent courts in
          Kathmandu, Nepal. We encourage customers to first contact{" "}
          <a
            href="mailto:support@kick.com.np"
            className="text-blue-600 underline"
          >
            support@kick.com.np
          </a>{" "}
          for an amicable resolution.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">
          9) Changes to These Terms
        </h2>
        <p>
          We may update these Terms from time to time. Updates will be posted on
          this page with a new “Last updated” date. Continued use of our
          services after changes take effect constitutes acceptance of the
          revised Terms.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">10) Contact</h2>
        <p>
          For questions about these Terms & Conditions, contact{" "}
          <a
            href="mailto:support@kick.com.np"
            className="text-blue-600 underline"
          >
            support@kick.com.np
          </a>{" "}
          or{" "}
          <a
            href="mailto:customer.care@kick-lifestyle.shop"
            className="text-blue-600 underline"
          >
            customer.care@kick-lifestyle.shop
          </a>{" "}
          |{" "}
          <a href="tel:+9779820810020" className="text-blue-600 underline">
            +977-9820810020
          </a>
        </p>

        <p className="text-sm text-gray-500 pt-2">
          Last updated: {lastUpdated}
        </p>
      </div>
    </section>
  );
};

export default Terms;
