import React from "react";

const Privacy = () => {
  return (
    <section className="space-y-6 leading-relaxed text-gray-700">
      <p>
        At <strong>Kick Lifestyle</strong>, we value your privacy and are
        committed to protecting your personal information. This Privacy Policy
        explains how we collect, use, and safeguard your data when you visit our
        website or make a purchase.
      </p>

      <h2 className="text-xl font-semibold text-gray-900">
        1. Information We Collect
      </h2>
      <p>
        We may collect personal information such as your name, email address,
        phone number, shipping/billing address, and payment details when you
        interact with our services or create an account.
      </p>

      <h2 className="text-xl font-semibold text-gray-900">
        2. How We Use Your Information
      </h2>
      <ul className="list-disc ml-6 space-y-2">
        <li>To process and deliver your orders.</li>
        <li>To communicate updates, promotions, or service notices.</li>
        <li>To improve our website experience and customer support.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900">3. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to ensure
        the protection of your personal information against unauthorized access,
        alteration, disclosure, or destruction.
      </p>

      <h2 className="text-xl font-semibold text-gray-900">
        4. Cookies & Tracking
      </h2>
      <p>
        Our website uses cookies and similar tracking technologies to enhance
        your browsing experience. You can control cookie preferences through
        your browser settings.
      </p>

      <h2 className="text-xl font-semibold text-gray-900">
        5. Third-Party Services
      </h2>
      <p>
        We may share limited information with trusted third-party partners for
        payment processing, analytics, and delivery services — only as necessary
        to perform our operations.
      </p>

      <h2 className="text-xl font-semibold text-gray-900">6. Your Rights</h2>
      <p>
        You have the right to access, correct, or delete your personal
        information and to withdraw consent where applicable. Please contact us
        at{" "}
        <a
          href="mailto:support@kick.com.np"
          className="text-blue-600 underline hover:text-blue-800"
        >
          support@kick.com.np
        </a>{" "}
        for such requests.
      </p>

      <h2 className="text-xl font-semibold text-gray-900">7. Policy Updates</h2>
      <p>
        This Privacy Policy may be updated periodically to reflect operational,
        legal, or regulatory changes. Any modifications will be posted on this
        page with an updated “Last Revised” date.
      </p>

      <p className="text-sm text-gray-500 pt-4">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </section>
  );
};

export default Privacy;
