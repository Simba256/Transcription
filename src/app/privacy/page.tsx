import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-4">
            Talk to Text Canada – Privacy Policy
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> July 28, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-700 mb-6">
              Talk to Text Canada (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA), applicable Ontario law, and other relevant regulations.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Audio and video files, transcripts, and template documents you upload</li>
              <li>Name, email address, billing and payment details</li>
              <li>Session data such as IP address, browser type, and usage logs</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              3. How We Use Information
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Deliver transcription services (AI, human, or hybrid)</li>
              <li>Communicate service updates, order confirmations, and billing notices</li>
              <li>Improve and personalize our platform through analytics</li>
              <li>Comply with legal obligations and resolve disputes</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              4. Data Retention
            </h2>
            <p className="text-gray-700 mb-4">
              We retain personal data only as long as necessary to fulfill the purposes below:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Transcription files and metadata are retained for 30 days after completion</li>
              <li>Payment records and account information are retained for 7 years for audit and tax compliance</li>
              <li>Backup snapshots may persist for up to 90 days</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              5. Third-Party Services and Data Transfers
            </h2>
            <p className="text-gray-700 mb-4">
              We rely on third parties for service functionality:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Speechmatics processes transcription requests under its own privacy practices; files are deleted per their schedule</li>
              <li>Our servers are hosted in Canada; any cross-border transfers use standard contractual clauses or equivalent safeguards</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              6. Cookies and Tracking Technologies
            </h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar technologies to enhance site performance. You can disable cookies in your browser settings, but some features may not function correctly.
            </p>

            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-[#003366]">Cookie Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-[#003366]">Purpose</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-[#003366]">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Session</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Maintain login and session state</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Session</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Analytics</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Collect anonymous usage data (e.g. Google Analytics)</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">2 years</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Functional</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">Remember user preferences and settings</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              7. Data Security
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Encryption of data at rest with AES-256 and in transit via TLS 1.2+</li>
              <li>Role-based access controls and multi-factor authentication for staff</li>
              <li>Quarterly security assessments and prompt vulnerability patching</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              8. Your Rights
            </h2>
            <p className="text-gray-700 mb-4">
              Under PIPEDA and other applicable laws, you may:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Request correction or deletion of inaccurate or outdated information</li>
              <li>Withdraw consent at any time (subject to legal or contractual restrictions)</li>
              <li>Lodge a complaint with the Privacy Commissioner of Canada</li>
            </ul>
            <p className="text-gray-700 mb-6">
              We will respond to access, correction, and deletion requests within 30 days.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              9. Policy Updates
            </h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy to reflect changes in our practices or legal requirements. When we do, we will:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Post the revised policy on our website with a new effective date</li>
              <li>Notify registered users by email or site banner</li>
            </ul>
            <p className="text-gray-700 mb-6">
              Please review this policy periodically.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              10. Contact Information
            </h2>
            <p className="text-gray-700 mb-4">
              If you have questions, requests, or complaints, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-gray-700">
                Talk to Text Canada<br />
                Brampton, Ontario<br />
                Email: <a href="mailto:info@talktotext.ca" className="text-[#003366] hover:underline">info@talktotext.ca</a>
              </p>
            </div>
          </div>

          <footer className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Last Updated: July 28, 2025
            </p>
          </footer>
        </div>
      </main>

      <Footer />
    </div>
  );
}