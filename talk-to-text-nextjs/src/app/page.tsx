'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/shared/header";
import Footer from "@/components/shared/footer";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    name: "AI-Powered Transcription",
    description: "Advanced speech recognition technology with 99%+ accuracy for clear audio.",
    icon: Zap,
  },
  {
    name: "Bank-Level Security",
    description: "End-to-end encryption and Canadian data residency for complete privacy.",
    icon: Shield,
  },
  {
    name: "Legal Document Production",
    description: "Specialized LegalScript Studio for court documents and legal proceedings.",
    icon: Globe,
  },
];

const services = [
  {
    name: "AI Transcription",
    description: "Automated transcription with locked PDF delivery for standard use cases.",
    features: ["99%+ accuracy", "Fast turnaround", "Locked PDF output", "Speaker identification"],
    price: "Starting at $0.10/minute",
  },
  {
    name: "Human Transcription",
    description: "Professional human transcribers for the highest accuracy requirements.",
    features: ["99.9% accuracy", "Human verification", "Complex audio handling", "Custom formatting"],
    price: "Starting at $1.50/minute",
  },
  {
    name: "LegalScript Studio",
    description: "Specialized legal document production with editable output.",
    features: ["Legal formatting", "Court forms library", "Editable DOCX output", "Template merging"],
    price: "Custom pricing",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ttt-navy"></div>
        </div>
      </>
    );
  }

  // Only show home page to non-authenticated users
  if (user) {
    return null; // Will redirect shortly
  }

  return (
    <>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-ttt-lavender-light via-white to-ttt-lavender">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Secure Voice-to-Text{" "}
                <span className="text-ttt-navy">Transcription Services</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Professional AI-powered transcription built for Canadian businesses. 
                Bank-level security, 99%+ accuracy, and specialized legal document production.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/trial">
                  <Button size="lg" variant="navy" className="gap-x-2">
                    Try Free (3 uploads)
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" size="lg">
                    Learn more
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-ttt-navy">
                Why Choose Talk to Text Canada
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Enterprise-grade transcription for every need
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Built specifically for Canadian businesses with security, accuracy, and compliance in mind.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.name} className="flex flex-col">
                    <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                      <feature.icon className="h-5 w-5 flex-none text-ttt-navy" aria-hidden="true" />
                      {feature.name}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                      <p className="flex-auto">{feature.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Choose Your Service Tier
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                From automated AI transcription to specialized legal document production.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.name} className="flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col">
                    <ul className="mb-6 space-y-3">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <CheckCircle className="h-5 w-5 flex-none text-ttt-navy mt-0.5" />
                          <span className="ml-3 text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <p className="text-lg font-semibold text-gray-900 mb-4">{service.price}</p>
                      <Button className="w-full" variant={service.name === "LegalScript Studio" ? "navy" : "outline"}>
                        Get Started
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-ttt-navy">
          <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
                Try our platform with 3 free uploads or 3 hours of transcription. 
                No credit card required.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/trial">
                  <Button size="lg" variant="secondary">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/contact" className="text-sm font-semibold leading-6 text-white">
                  Contact sales <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
