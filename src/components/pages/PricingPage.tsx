"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Star, Clock, Users, Zap, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// Declare stripe-pricing-table as a valid HTML element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
        },
        HTMLElement
      >;
    }
  }
}

export function PricingPage() {
  const [selectedTab, setSelectedTab] = useState('ai');

  // Pricing data from CSV files
  const pricingPlans = {
    ai: [
      {
        name: 'AI Light',
        minutes: 300,
        price: 225,
        pricePerMinute: 0.75,
        description: 'Perfect for individuals and small projects',
        features: [
          '300 AI minutes included',
          'Fast automated transcription (60 min turnaround)',
          'Speaker detection & diarization',
          'Transcript editor with search',
          'DOCX & PDF export',
          'English & French support',
          'Standard email support'
        ]
      },
      {
        name: 'AI Pro',
        minutes: 750,
        price: 488,
        originalPrice: 562.50,
        pricePerMinute: 0.65,
        savings: 'Save CA$74.50',
        description: 'Most popular for regular users',
        popular: true,
        features: [
          '750 AI minutes included',
          'Fast automated transcription (60 min turnaround)',
          'Speaker detection & diarization',
          'Advanced transcript editor',
          'DOCX & PDF export',
          'English & French support',
          'Priority email support',
          'Bulk file upload (up to 10 files)'
        ]
      },
      {
        name: 'AI Enterprise',
        minutes: 1500,
        price: 900,
        originalPrice: 1125,
        pricePerMinute: 0.60,
        savings: 'Save CA$225',
        description: 'Best value for high-volume users',
        features: [
          '1,500 AI minutes included',
          'Fast automated transcription (60 min turnaround)',
          'Speaker detection & diarization',
          'Advanced transcript editor',
          'DOCX & PDF export',
          'English & French support',
          'Dedicated support team',
          'Unlimited bulk uploads',
          'Custom export templates'
        ]
      }
    ],
    hybrid: [
      {
        name: 'Hybrid Light',
        minutes: 300,
        price: 360,
        pricePerMinute: 1.20,
        description: 'Great for important recordings',
        features: [
          '300 minutes included',
          'AI + Human review',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '98%+ accuracy guarantee',
          'Professional formatting',
          'DOCX & PDF export',
          'Email support'
        ]
      },
      {
        name: 'Hybrid Pro',
        minutes: 750,
        price: 862.50,
        originalPrice: 900,
        pricePerMinute: 1.15,
        savings: 'Save CA$37.50',
        description: 'Ideal for business professionals',
        popular: true,
        features: [
          '750 minutes included',
          'AI + Human review',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '98%+ accuracy guarantee',
          'Professional formatting',
          'Priority processing available',
          'Phone & email support',
          'Custom vocabulary support'
        ]
      },
      {
        name: 'Hybrid Enterprise',
        minutes: 1500,
        price: 1950,
        originalPrice: 2250,
        pricePerMinute: 1.30,
        savings: 'Save CA$300',
        description: 'Perfect for organizations',
        features: [
          '1,500 minutes included',
          'AI + Human review',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '98%+ accuracy guarantee',
          'Professional formatting',
          'Priority processing included',
          'Dedicated account manager',
          'Custom vocabulary & formatting',
          'Volume discount on add-ons'
        ]
      }
    ],
    human: [
      {
        name: 'Human Light',
        minutes: 300,
        price: 750,
        pricePerMinute: 2.50,
        description: 'Professional transcription for critical content',
        features: [
          '300 minutes included',
          '100% human transcription',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '99%+ accuracy guarantee',
          'Verbatim or clean read',
          'Professional formatting',
          'Time-coding included',
          'Email support'
        ]
      },
      {
        name: 'Human Pro',
        minutes: 750,
        price: 1725,
        originalPrice: 1875,
        pricePerMinute: 2.30,
        savings: 'Save CA$150',
        description: 'For legal, medical, and media professionals',
        popular: true,
        features: [
          '750 minutes included',
          '100% human transcription',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '99%+ accuracy guarantee',
          'Verbatim or clean read',
          'Professional formatting',
          'Time-coding included',
          'Priority processing available',
          'Industry-specific formatting'
        ]
      },
      {
        name: 'Human Enterprise',
        minutes: 1500,
        price: 3150,
        originalPrice: 3750,
        pricePerMinute: 2.10,
        savings: 'Save CA$600',
        description: 'Maximum accuracy for enterprise needs',
        features: [
          '1,500 minutes included',
          '100% human transcription',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '99%+ accuracy guarantee',
          'Verbatim or clean read',
          'Professional formatting',
          'Time-coding included',
          'Dedicated transcription team',
          'Custom style guides',
          'Quality assurance review'
        ]
      }
    ]
  };

  const addOns = [
    {
      type: 'Rush Delivery',
      description: '24-48 hour turnaround',
      hybrid: '+$0.50/minute',
      human: '+$0.75/minute'
    },
    {
      type: 'Multiple Speakers',
      description: '3 or more speakers',
      hybrid: '+$0.25/minute',
      human: '+$0.30/minute'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section
        className="relative text-white py-24"
        style={{
          backgroundImage: "url('/bg_1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/80 to-[#2c3e50]/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Professional Transcription Pricing
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Choose from AI-powered, Hybrid, or 100% Human transcription services.
            Save with bundled packages or pay as you go.
          </p>
        </div>
      </section>

      {/* Main Pricing Section with Tabs */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-12">
              <TabsTrigger value="ai" className="flex items-center justify-center">
                <Zap className="h-4 w-4 mr-2" />
                AI Transcription
              </TabsTrigger>
              <TabsTrigger value="hybrid" className="flex items-center justify-center">
                <Users className="h-4 w-4 mr-2" />
                Hybrid (AI + Human)
              </TabsTrigger>
              <TabsTrigger value="human" className="flex items-center justify-center">
                <Check className="h-4 w-4 mr-2" />
                100% Human
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#003366] mb-2">AI Transcription Packages</h3>
                <p className="text-gray-600">Fast, automated transcription delivered within 60 minutes</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {pricingPlans.ai.map((plan, index) => (
                  <Card
                    key={index}
                    className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full ${
                      plan.popular ? 'ring-2 ring-[#b29dd9] scale-105' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-2xl font-bold text-[#003366]">
                        {plan.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{plan.minutes} minutes included</p>

                      <div className="mt-4">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-4xl font-bold text-[#003366]">
                            CA${plan.price}
                          </span>
                          {plan.originalPrice && (
                            <span className="text-lg text-gray-400 line-through">
                              CA${plan.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          CA${plan.pricePerMinute}/minute
                        </div>
                        {plan.savings && (
                          <div className="text-green-600 font-medium text-sm mt-2">
                            {plan.savings}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex-1 flex flex-col">
                      <ul className="space-y-2 mb-8 flex-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        className={`w-full mt-auto ${
                          plan.popular
                            ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                            : 'bg-[#003366] hover:bg-[#002244]'
                        } text-white`}
                      >
                        <Link href="/signup">Sign Up Now</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hybrid">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#003366] mb-2">Hybrid Transcription Packages</h3>
                <p className="text-gray-600">AI transcription with human review - delivered in 3-5 business days</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {pricingPlans.hybrid.map((plan, index) => (
                  <Card
                    key={index}
                    className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full ${
                      plan.popular ? 'ring-2 ring-[#b29dd9] scale-105' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-2xl font-bold text-[#003366]">
                        {plan.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{plan.minutes} minutes included</p>

                      <div className="mt-4">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-4xl font-bold text-[#003366]">
                            CA${plan.price}
                          </span>
                          {plan.originalPrice && (
                            <span className="text-lg text-gray-400 line-through">
                              CA${plan.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          CA${plan.pricePerMinute}/minute
                        </div>
                        {plan.savings && (
                          <div className="text-green-600 font-medium text-sm mt-2">
                            {plan.savings}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex-1 flex flex-col">
                      <ul className="space-y-2 mb-8 flex-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        className={`w-full mt-auto ${
                          plan.popular
                            ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                            : 'bg-[#003366] hover:bg-[#002244]'
                        } text-white`}
                      >
                        <Link href="/signup">Sign Up Now</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="human">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#003366] mb-2">100% Human Transcription Packages</h3>
                <p className="text-gray-600">Professional human transcription - delivered in 3-5 business days</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {pricingPlans.human.map((plan, index) => (
                  <Card
                    key={index}
                    className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full ${
                      plan.popular ? 'ring-2 ring-[#b29dd9] scale-105' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-2xl font-bold text-[#003366]">
                        {plan.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{plan.minutes} minutes included</p>

                      <div className="mt-4">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-4xl font-bold text-[#003366]">
                            CA${plan.price}
                          </span>
                          {plan.originalPrice && (
                            <span className="text-lg text-gray-400 line-through">
                              CA${plan.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          CA${plan.pricePerMinute}/minute
                        </div>
                        {plan.savings && (
                          <div className="text-green-600 font-medium text-sm mt-2">
                            {plan.savings}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex-1 flex flex-col">
                      <ul className="space-y-2 mb-8 flex-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        className={`w-full mt-auto ${
                          plan.popular
                            ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                            : 'bg-[#003366] hover:bg-[#002244]'
                        } text-white`}
                      >
                        <Link href="/signup">Sign Up Now</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Pay As You Go Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Pay As You Go
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Need flexibility? Pay only for what you use with our per-minute pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  AI Only
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA$1.20
                </div>
                <div className="text-gray-600">/minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Fast automated transcription
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  No minimum commitment
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Hybrid
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA$1.50
                </div>
                <div className="text-gray-600">/minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  AI + Human review
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Pay only for what you use
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  100% Human
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA$2.50
                </div>
                <div className="text-gray-600">/minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Professional human transcription
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Maximum accuracy guaranteed
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button
              asChild
              variant="outline"
              className="mx-auto"
            >
              <Link href="/signup">
                <CreditCard className="h-4 w-4 mr-2" />
                Sign Up to Get Started
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Premium Add-ons
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              <strong className="text-green-600">FREE with all packages</strong> • Additional charges apply for pay-as-you-go
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {addOns.map((addon, index) => (
              <Card key={index} className="border-0 shadow-lg mb-6">
                <CardContent className="p-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-[#003366] mb-2">
                        {addon.type}
                      </h3>
                      <p className="text-gray-600">{addon.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          FREE with packages
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Pay-as-you-go: Hybrid {addon.hybrid}</p>
                      <p className="text-sm text-gray-500">Pay-as-you-go: Human {addon.human}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Package Benefit:</strong> All minute packages include rush delivery and multiple speaker detection at no additional cost. This benefit alone can save hundreds of dollars!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Top-up Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Wallet Top-Up
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Pre-load your account with credits for add-on services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$50
                </div>
                <p className="text-gray-600 mb-4">Starter wallet</p>
                <div className="text-xs text-gray-500 mt-4">
                  Available for customers
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$200
                </div>
                <p className="text-gray-600 mb-4">Professional wallet</p>
                <div className="text-xs text-gray-500 mt-4">
                  Available for customers
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$500
                </div>
                <p className="text-gray-600 mb-4">Enterprise wallet</p>
                <div className="text-xs text-gray-500 mt-4">
                  Available for customers
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Compare Features
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-lg">
              <thead>
                <tr className="bg-[#003366] text-white">
                  <th className="p-4 text-left">Feature</th>
                  <th className="p-4 text-center">AI</th>
                  <th className="p-4 text-center">Hybrid</th>
                  <th className="p-4 text-center">Human</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Accuracy</td>
                  <td className="p-4 text-center">95%+</td>
                  <td className="p-4 text-center">98%+</td>
                  <td className="p-4 text-center">99%+</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Turnaround Time</td>
                  <td className="p-4 text-center">60 minutes</td>
                  <td className="p-4 text-center">3-5 business days</td>
                  <td className="p-4 text-center">3-5 business days</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Speaker Detection</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">✓</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Languages</td>
                  <td className="p-4 text-center">English, French</td>
                  <td className="p-4 text-center">English</td>
                  <td className="p-4 text-center">English</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Package Starting Price</td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">CA$0.60/min</td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">CA$1.15/min</td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">CA$2.10/min</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Pay As You Go Price</td>
                  <td className="p-4 text-center">CA$1.20/min</td>
                  <td className="p-4 text-center">CA$1.50/min</td>
                  <td className="p-4 text-center">CA$2.50/min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Do unused minutes expire?
              </h3>
              <p className="text-gray-600">
                Yes, package minutes expire after 30 days. Pay-as-you-go has no expiration.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What's the difference between AI, Hybrid, and Human transcription?
              </h3>
              <p className="text-gray-600">
                AI is fully automated and fastest (within 1 hour). Hybrid combines AI with human review
                for better accuracy (3-5 business days). Human is 100% typed by professionals for maximum
                accuracy (3-5 business days).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Can I upgrade my package?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade anytime and unused minutes will be prorated to your new package.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What file formats do you support?
              </h3>
              <p className="text-gray-600">
                We support all major audio and video formats including MP3, WAV, M4A, FLAC, MP4, MOV, and more.
                Maximum file size is 1GB.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                How does wallet credit work?
              </h3>
              <p className="text-gray-600">
                Wallet credits are used for add-on services like rush delivery or multiple speaker
                identification. Top up your wallet and we'll automatically deduct as needed.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Is there a volume discount?
              </h3>
              <p className="text-gray-600">
                Yes! Our bundled packages offer significant savings compared to pay-as-you-go rates.
                The more minutes you purchase, the lower the per-minute cost.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Default export for Next.js pages compatibility
export default PricingPage;