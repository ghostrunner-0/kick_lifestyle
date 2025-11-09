import React from "react";

const Terms = () => {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <section className="space-y-8 leading-relaxed text-gray-700">
      <p>
        Welcome to <strong>Kick Lifestyle</strong>. By accessing or using our
        website, purchasing products, or engaging with our services, you agree
        to the following Terms & Conditions. Please read them carefully before
        proceeding.
      </p>

      {/* 1) Warranty Coverage */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">1) Warranty Coverage</h2>
        <p>
          All <strong>Kick Lifestyle</strong> products are covered under a limited
          warranty for <strong>one (1) year</strong> from the date of purchase
          (<strong>6 months for batteries</strong>). This warranty protects against
          defects in materials and workmanship under normal usage conditions.
        </p>

        <h3 className="font-medium text-gray-900">Warranty Exclusions</h3>
        <ul className="list-disc ml-6 space-y-2">
          <li>Products tampered with or repaired by unauthorized personnel.</li>
          <li>Any form of physical damage, cracks, dents, or scratches.</li>
          <li>Damage caused by liquid exposure, moisture, or corrosion.</li>
          <li>
            Battery-related defects after <strong>6 months</strong> from purchase
            are not covered under warranty.
          </li>
          <li>
            Use of chargers exceeding <strong>5W output</strong> may damage the
            product and <strong>void the warranty</strong>.
          </li>
        </ul>

        <h3 className="font-medium text-gray-900">Warranty Claim Process</h3>
        <ol className="list-decimal ml-6 space-y-2">
          <li>
            Contact our support team via{" "}
            <a
              href="mailto:customer.care@kick-lifestyle.shop"
              className="text-blue-600 underline"
            >
              customer.care@kick-lifestyle.shop
            </a>{" "}
            or call{" "}
            <a href="tel:+9779820810020" className="text-blue-600 underline">
              +977-9820810020
            </a>{" "}
            with your order details and issue description.
          </li>
          <li>
            Our team may request additional details, such as proof of purchase or
            photographs, to validate the claim.
          </li>
          <li>
            If approved, you’ll receive return instructions. Please ensure the
            product is securely packed to prevent transit damage.
          </li>
          <li>
            After inspection, we will <strong>repair or replace</strong> the product
            at our discretion.
          </li>
        </ol>
        <p className="text-sm">
          *Customers are responsible for shipping costs related to warranty service.
        </p>

        <h3 className="font-medium text-gray-900">Limitations of Liability</h3>
        <p>
          Kick Lifestyle’s liability under this warranty is limited to repair or
          replacement. We are not responsible for indirect, incidental, or
          consequential losses resulting from product use or malfunction. Warranty
          coverage applies only to the original purchaser and is non-transferable.
        </p>
      </div>

      {/* 2) Return & Replacement Policy */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          2) Return & Replacement Policy
        </h2>
        <p>
          Kick Lifestyle does <strong>not offer a general return policy</strong>.
          Once an order is successfully delivered, it is considered final.
          Replacements or repairs are only processed under our official{" "}
          <strong>warranty terms</strong> in the case of manufacturing defects.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            Returns for reasons such as “change of mind,” “wrong selection,” or
            “dislike of product” are not accepted.
          </li>
          <li>
            If you receive a damaged or defective product, you must report it
            within <strong>48 hours</strong> of delivery for verification.
          </li>
          <li>
            Once verified, a replacement or repair will be arranged as per our
            warranty process.
          </li>
        </ul>
        <p className="italic">
          We ensure all products are quality-checked before shipment to minimize
          any inconvenience.
        </p>
      </div>

      {/* 3) Failed Delivery */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">3) Failed Delivery</h2>
        <p>
          Delivery attempts that fail due to customer-related reasons—such as an
          incorrect address, refusal to accept the package, or unavailability at
          the time of delivery—will be marked as a{" "}
          <strong>failed delivery</strong>.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            The customer will be responsible for the delivery charges incurred,
            including the cost of reattempting delivery.
          </li>
          <li>
            Rescheduled deliveries are subject to additional fees and standard
            delivery terms.
          </li>
          <li>
            Orders may be cancelled if outstanding charges are not cleared before
            reshipment.
          </li>
        </ul>
      </div>

      {/* 4) Orders, Pricing, and Liability */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          4) Orders, Pricing & Payments
        </h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            Product prices are subject to change without prior notice. Obvious
            errors may result in cancellation and a full refund.
          </li>
          <li>
            We reserve the right to cancel or refuse any order due to inventory
            constraints, fraud concerns, or pricing inaccuracies.
          </li>
          <li>
            Payment must be completed using the available checkout options. By
            placing an order, you consent to the authorized charge on your selected
            payment method.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900">
          5) Limitation of Liability
        </h2>
        <p>
          To the fullest extent permitted by law, Kick Lifestyle shall not be held
          liable for any indirect, incidental, or consequential damages arising
          from the use or inability to use our products or services.
        </p>

        <h2 className="text-xl font-semibold text-gray-900">
          6) Governing Law & Dispute Resolution
        </h2>
        <p>
          These Terms are governed by the laws of Nepal. Any disputes will be
          subject to the exclusive jurisdiction of the courts in Kathmandu, Nepal.
          For resolution or assistance, please contact{" "}
          <a href="mailto:support@kick.com.np" className="text-blue-600 underline">
            support@kick.com.np
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold text-gray-900">7) Contact</h2>
        <p>
          For any questions or support, reach out to us at{" "}
          <a
            href="mailto:customer.care@kick-lifestyle.shop"
            className="text-blue-600 underline"
          >
            customer.care@kick-lifestyle.shop
          </a>{" "}
          or{" "}
          <a href="tel:+9779820810020" className="text-blue-600 underline">
            +977-9820810020
          </a>
          .
        </p>

        <p className="text-sm text-gray-500 pt-2">Last updated: {lastUpdated}</p>
      </div>
    </section>
  );
};

export default Terms;
