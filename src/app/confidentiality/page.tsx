import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function ConfidentialityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-4">
            Talk to Text Canada – Confidentiality Agreement
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> July 28, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-6">
              This Confidentiality Agreement (&quot;Agreement&quot;) is entered into between Talk to Text Canada and any individual or entity (&quot;Client&quot;) using our services.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              1. Confidential Materials
            </h2>
            <p className="text-gray-700 mb-6">
              Client files, templates, audio/video content, and resulting transcripts (&quot;Confidential Information&quot;) are protected by this Agreement.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              2. Obligations
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Keep all Confidential Information private and secure</li>
              <li>Restrict access to trained personnel bound by NDAs</li>
              <li>Never share content with third parties without explicit consent</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              3. Data Handling
            </h2>
            <p className="text-gray-700 mb-6">
              Documents are stored securely within Canada. AI transcription may temporarily use external processors (Speechmatics) with strict deletion policies.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              4. Human Review
            </h2>
            <p className="text-gray-700 mb-6">
              Human-reviewed services are performed by Canadian contractors under confidentiality terms.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              5. Term
            </h2>
            <p className="text-gray-700 mb-6">
              This Agreement remains in effect for all services rendered and continues beyond project closure.
            </p>
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