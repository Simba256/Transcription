import { Shield, Users, Globe, Award, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/shared/header";
import Footer from "@/components/shared/footer";

const values = [
  {
    name: "Security First",
    description: "Every aspect of our platform is built with enterprise-grade security and Canadian data privacy regulations in mind.",
    icon: Shield,
  },
  {
    name: "Canadian Focus",
    description: "Built specifically for Canadian businesses with local data residency and compliance with Canadian privacy laws.",
    icon: Globe,
  },
  {
    name: "Professional Excellence",
    description: "Our team combines deep technical expertise with professional transcription experience spanning over a decade.",
    icon: Award,
  },
  {
    name: "Customer Success",
    description: "We're committed to your success with dedicated support, comprehensive documentation, and ongoing platform improvements.",
    icon: Users,
  },
];

const stats = [
  { name: "Transcription Accuracy", value: "99.8%" },
  { name: "Canadian Businesses Served", value: "500+" },
  { name: "Hours Transcribed", value: "50,000+" },
  { name: "Average Processing Time", value: "< 5 min" },
];

const features = [
  "Advanced AI speech recognition technology",
  "Multi-speaker identification and separation",
  "Legal document template integration",
  "Ontario Court Forms library access",
  "End-to-end encryption and secure processing",
  "Canadian data residency compliance",
  "Professional human verification available",
  "Custom formatting and template support",
];

export default function AboutPage() {
  return (
    <>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-ttt-lavender-light via-white to-ttt-lavender py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                About <span className="text-ttt-navy">Talk to Text Canada</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                We're revolutionizing transcription services for Canadian businesses with 
                AI-powered technology, uncompromising security, and specialized legal document production.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-ttt-navy">Our Mission</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Transforming voice into powerful, secure documentation
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                In an increasingly digital world, Canadian businesses need transcription services that understand 
                local requirements, privacy concerns, and professional standards. Talk to Text Canada bridges 
                advanced AI technology with Canadian values of privacy, security, and professional excellence.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-ttt-navy py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.name} className="mx-auto flex max-w-xs flex-col gap-y-4">
                  <dt className="text-base leading-7 text-gray-300">{stat.name}</dt>
                  <dd className="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-ttt-navy">Our Values</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Built on Canadian principles
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Every decision we make is guided by core values that reflect what Canadian businesses 
                need from their technology partners.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                {values.map((value) => (
                  <div key={value.name} className="flex flex-col">
                    <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                      <value.icon className="h-5 w-5 flex-none text-ttt-navy" aria-hidden="true" />
                      {value.name}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                      <p className="flex-auto">{value.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Advanced Technology, Canadian Values
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Our platform combines cutting-edge AI speech recognition with robust security measures 
                  and compliance frameworks designed specifically for Canadian businesses.
                </p>
                <p className="mt-4 text-lg leading-8 text-gray-600">
                  From legal professionals requiring court-ready documents to businesses needing 
                  accurate meeting transcriptions, we provide the tools and security you need.
                </p>
                <div className="mt-8">
                  <Link href="/trial">
                    <Button variant="navy" size="lg" className="gap-x-2">
                      Try Our Technology
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Platform Features</CardTitle>
                  <CardDescription>
                    Comprehensive capabilities designed for professional use
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-ttt-navy mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-ttt-navy">Our Team</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Experts in transcription and technology
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Our team brings together decades of experience in professional transcription, 
                AI technology, legal document production, and Canadian business requirements.
              </p>
            </div>
            
            <div className="mt-16 bg-ttt-lavender-light p-8 rounded-2xl">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Founded by Canadian Professionals
                </h3>
                <p className="text-gray-600 max-w-3xl mx-auto">
                  Talk to Text Canada was founded by a team of Canadian entrepreneurs who recognized 
                  the need for a transcription service that truly understands Canadian business requirements, 
                  privacy concerns, and professional standards. Our founders combine backgrounds in 
                  legal services, technology, and professional transcription.
                </p>
                <div className="mt-8">
                  <Link href="/about/founder" className="text-ttt-navy hover:text-ttt-navy-light font-medium">
                    Learn more about our founder →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-ttt-navy">
          <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to experience the difference?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
                Join hundreds of Canadian businesses who trust Talk to Text Canada 
                for their transcription needs.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/trial">
                  <Button size="lg" variant="secondary">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/contact" className="text-sm font-semibold leading-6 text-white">
                  Contact us <span aria-hidden="true">→</span>
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