"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Shield, Clock, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#003366] to-[#2c3e50] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Professional Transcription
              <span className="block text-[#b29dd9]">Made Simple</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Accurate, secure, and reliable transcription services for legal professionals, 
              businesses, and individuals across Canada.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white text-lg px-15 py-4"
              >
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-white !bg-white !text-[#003366] hover:!bg-gray-50 hover:!text-[#003366] text-lg px-8 py-4 font-medium opacity-100"
              >
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Why Choose Talk To Text Canada?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We offer three transcription modes to meet your specific needs and budget.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  AI Transcription
                </h3>
                <p className="text-gray-600 mb-6">
                  Fast, automated transcription with high accuracy. Perfect for quick turnarounds 
                  and cost-effective solutions.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Instant processing
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Editable transcripts
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Most affordable
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Human Transcription
                </h3>
                <p className="text-gray-600 mb-6">
                  Professional human transcribers ensure the highest accuracy for legal 
                  and business-critical documents.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    99%+ accuracy
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Legal expertise
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Quality guaranteed
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Hybrid Review
                </h3>
                <p className="text-gray-600 mb-6">
                  AI speed with human precision. Get the best of both worlds with 
                  AI transcription reviewed by professionals.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Fast + accurate
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Human verified
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Best value
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Trusted by Legal Professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Secure, confidential, and compliant with Canadian privacy regulations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#003366] mb-2">99.5%</div>
              <div className="text-gray-600">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#003366] mb-2">24/7</div>
              <div className="text-gray-600">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#003366] mb-2">SOC 2</div>
              <div className="text-gray-600">Compliant</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#003366] mb-2">10k+</div>
              <div className="text-gray-600">Files Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#003366] text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who trust Talk To Text Canada 
            for their transcription needs.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white text-lg px-8 py-3"
          >
            <Link href="/signup">
              Start Your Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}