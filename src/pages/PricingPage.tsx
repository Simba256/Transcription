"use client";

import React from 'react';
import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export function PricingPage() {
  const packages = [
    {
      id: 'starter',
      name: 'Starter Pack',
      credits: 1000,
      price: 10,
      description: 'Perfect for individuals and small projects',
      features: [
        '1,000 credits',
        'AI transcription',
        'Basic editing tools',
        'PDF/DOCX export',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional Pack',
      credits: 5000,
      price: 45,
      originalPrice: 50,
      savings: '10% savings',
      popular: true,
      description: 'Most popular for businesses and professionals',
      features: [
        '5,000 credits',
        'All transcription modes',
        'Advanced editing tools',
        'Priority processing',
        'Redaction tools',
        'Phone support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pack',
      credits: 12000,
      price: 100,
      originalPrice: 120,
      savings: '17% savings',
      description: 'Best value for high-volume users',
      features: [
        '12,000 credits',
        'All transcription modes',
        'Bulk upload',
        'Custom formatting',
        'API access',
        'Dedicated support'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#003366] to-[#2c3e50] text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Pay only for what you use with our credit-based system. 
            No subscriptions, no hidden fees.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id}
                className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full ${
                  pkg.popular ? 'ring-2 ring-[#b29dd9] scale-105' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-[#003366]">
                    {pkg.name}
                  </CardTitle>
                  <p className="text-gray-600">{pkg.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-4xl font-bold text-[#003366]">
                        CA${pkg.price}
                      </span>
                      {pkg.originalPrice && (
                        <span className="text-lg text-gray-400 line-through">
                          CA${pkg.originalPrice}
                        </span>
                      )}
                    </div>
                    {pkg.savings && (
                      <div className="text-green-600 font-medium text-sm mt-1">
                        {pkg.savings}
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    asChild
                    className={`w-full mt-auto ${
                      pkg.popular
                        ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                        : 'bg-[#003366] hover:bg-[#002244]'
                    } text-white`}
                  >
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Usage Guide */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              How Credits Work
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Credits are consumed based on transcription mode and file duration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  AI Transcription
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  1 credit
                </div>
                <div className="text-gray-600">per minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Fast, automated transcription with good accuracy
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Hybrid Review
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  2 credits
                </div>
                <div className="text-gray-600">per minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  AI transcription reviewed by human experts
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Human Transcription
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  3 credits
                </div>
                <div className="text-gray-600">per minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Professional human transcription for highest accuracy
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Do credits expire?
              </h3>
              <p className="text-gray-600">
                No, your credits never expire. Use them at your own pace.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Can I get a refund if I'm not satisfied?
              </h3>
              <p className="text-gray-600">
                Yes, we offer a 30-day money-back guarantee on all credit purchases.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What file formats do you support?
              </h3>
              <p className="text-gray-600">
                We support all major audio and video formats including MP3, WAV, MP4, MOV, and more.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Absolutely. We use enterprise-grade encryption and are SOC 2 compliant. 
                Your files are automatically deleted after 30 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}