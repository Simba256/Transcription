import { Check, X, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/shared/header";
import Footer from "@/components/shared/footer";

const tiers = [
  {
    name: "Trial",
    id: "trial",
    price: "Free",
    description: "Perfect for testing our platform",
    features: [
      "3 file uploads OR 3 hours",
      "AI transcription only",
      "Basic accuracy (95%+)",
      "Locked PDF output",
      "Email support",
      "30-day access",
    ],
    notIncluded: [
      "Human verification",
      "Editable formats",
      "Priority support",
      "Legal templates",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "AI Professional",
    id: "ai-pro",
    price: "$0.10",
    priceUnit: "per minute",
    description: "AI-powered transcription for businesses",
    features: [
      "Unlimited uploads",
      "99%+ accuracy",
      "Speaker identification",
      "Timestamp generation",
      "Locked PDF output",
      "Priority email support",
      "Bulk processing",
      "API access",
    ],
    notIncluded: [
      "Human verification",
      "Editable formats",
      "Legal templates",
    ],
    cta: "Choose AI Pro",
    popular: true,
  },
  {
    name: "Human Verified",
    id: "human",
    price: "$1.50",
    priceUnit: "per minute",
    description: "Human-verified for highest accuracy",
    features: [
      "Everything in AI Pro",
      "Human verification",
      "99.9% accuracy guarantee",
      "Complex audio handling",
      "Custom formatting",
      "Phone support",
      "24-hour turnaround",
      "Quality guarantee",
    ],
    notIncluded: [
      "Legal templates",
      "Editable formats",
    ],
    cta: "Choose Human Verified",
    popular: false,
  },
  {
    name: "LegalScript Studio",
    id: "legal",
    price: "Custom",
    description: "Specialized legal document production",
    features: [
      "Everything in Human Verified",
      "Legal document templates",
      "Ontario Court Forms library",
      "Editable DOCX output",
      "Template merging",
      "Legal formatting",
      "Dedicated support",
      "Compliance reporting",
      "Custom integrations",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqs = [
  {
    question: "How is pricing calculated?",
    answer: "Pricing is based on the actual length of your audio files. We charge per minute of audio, rounded up to the nearest minute. There are no setup fees or monthly minimums."
  },
  {
    question: "What's the difference between AI and Human verification?",
    answer: "AI transcription uses advanced speech recognition technology for fast, accurate results (99%+ accuracy). Human verification adds a professional review step for the highest possible accuracy (99.9%) and complex audio handling."
  },
  {
    question: "Why can't I edit AI transcription outputs?",
    answer: "AI and Human Verified services provide locked PDFs to maintain document integrity and prevent unauthorized modifications. LegalScript Studio provides editable DOCX files for legal professionals who need to customize documents."
  },
  {
    question: "Do you offer volume discounts?",
    answer: "Yes! We offer custom pricing for high-volume customers. Contact our sales team to discuss your specific requirements and volume discounts."
  },
  {
    question: "Is my data secure and private?",
    answer: "Absolutely. We use bank-level encryption, Canadian data residency, and comply with all Canadian privacy regulations. Your audio files and transcripts are never shared or used for training purposes."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, there are no long-term contracts. You only pay for what you use. You can upgrade, downgrade, or cancel your account at any time."
  },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-ttt-lavender-light via-white to-ttt-lavender py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Simple, <span className="text-ttt-navy">Transparent Pricing</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Choose the plan that fits your needs. Start with our free trial, 
                then scale as your transcription requirements grow.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
              {tiers.map((tier) => (
                <Card 
                  key={tier.id} 
                  className={`relative flex flex-col justify-between ${
                    tier.popular ? 'ring-2 ring-ttt-navy shadow-lg scale-105' : ''
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-ttt-navy px-3 py-1 text-xs font-medium text-white">
                        <Star className="h-3 w-3" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="pb-6">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {tier.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
                      {tier.priceUnit && (
                        <span className="text-sm text-gray-600 ml-1">{tier.priceUnit}</span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col flex-1">
                    <ul className="space-y-3 flex-1">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <Check className="h-4 w-4 text-ttt-navy mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                      {tier.notIncluded.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <X className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-sm text-gray-400">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-8">
                      <Button
                        className="w-full"
                        variant={tier.popular ? "navy" : "outline"}
                      >
                        {tier.cta}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Not sure which plan is right for you?
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Here's a quick guide to help you choose the perfect plan for your needs.
              </p>
            </div>
            
            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>For Quick Tests</CardTitle>
                  <CardDescription>Perfect if you want to try our platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Start with our free trial to test the quality and features. 
                    No credit card required.
                  </p>
                  <Link href="/trial">
                    <Button variant="outline" className="w-full">
                      Start Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>For Regular Business Use</CardTitle>
                  <CardDescription>AI Professional or Human Verified</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose AI Pro for fast, accurate transcription or Human Verified 
                    for the highest accuracy requirements.
                  </p>
                  <Link href="/register">
                    <Button variant="navy" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>For Legal Professionals</CardTitle>
                  <CardDescription>LegalScript Studio is designed for you</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Specialized features for legal document production, court forms, 
                    and editable output formats.
                  </p>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full gap-x-2">
                      Contact Sales
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Have questions about our pricing? We've got answers.
              </p>
            </div>
            
            <div className="mt-16 space-y-8">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{faq.answer}</p>
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
                Start with our free trial and experience the Talk to Text Canada difference.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/trial">
                  <Button size="lg" variant="secondary">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/contact" className="text-sm font-semibold leading-6 text-white">
                  Have questions? Contact us <span aria-hidden="true">→</span>
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