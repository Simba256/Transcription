import { Zap, Users, Lightbulb, Scale, CheckCircle, ArrowRight, Clock, Shield, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/shared/header";
import Footer from "@/components/shared/footer";

const services = [
  {
    id: "ai",
    name: "AI Transcription",
    icon: Zap,
    description: "Advanced AI-powered speech recognition with 99%+ accuracy for clear audio recordings.",
    price: "Starting at $0.10/minute",
    turnaround: "5-15 minutes",
    accuracy: "99%+",
    features: [
      "Lightning-fast processing",
      "Speaker identification",
      "Timestamp generation", 
      "Punctuation and formatting",
      "Multiple audio formats supported",
      "Locked PDF delivery",
    ],
    bestFor: [
      "Business meetings",
      "Interviews",
      "Lectures and presentations",
      "Clear single or multi-speaker audio",
    ],
    limitations: [
      "Best for clear audio quality",
      "May struggle with heavy accents",
      "Background noise can affect accuracy",
    ]
  },
  {
    id: "human",
    name: "Human Transcription",
    icon: Users,
    description: "Professional human transcribers deliver the highest accuracy for complex audio scenarios.",
    price: "Starting at $1.50/minute", 
    turnaround: "24-48 hours",
    accuracy: "99.9%",
    features: [
      "Human verification and editing",
      "Complex audio handling",
      "Accent and dialect expertise",
      "Custom formatting requests",
      "Quality guarantee",
      "Professional review process",
    ],
    bestFor: [
      "Legal proceedings",
      "Medical consultations", 
      "Poor audio quality recordings",
      "Heavy accents or dialects",
      "Critical accuracy requirements",
    ],
    limitations: [
      "Longer turnaround time",
      "Higher cost per minute",
    ]
  },
  {
    id: "hybrid",
    name: "Hybrid (AI + Human)",
    icon: Lightbulb,
    description: "Best of both worlds - AI speed with human verification for optimal accuracy and efficiency.",
    price: "Starting at $0.75/minute",
    turnaround: "2-6 hours", 
    accuracy: "99.8%",
    features: [
      "AI initial processing",
      "Human verification and correction",
      "Faster than pure human transcription",
      "Higher accuracy than AI-only",
      "Quality assurance process",
      "Professional formatting",
    ],
    bestFor: [
      "Important business meetings",
      "Research interviews",
      "Moderate quality audio",
      "Time-sensitive projects",
    ],
    limitations: [
      "More expensive than AI-only",
      "Longer than pure AI processing",
    ]
  },
  {
    id: "legal",
    name: "LegalScript Studio",
    icon: Scale,
    description: "Specialized legal document production with court-ready formatting and Ontario Court Forms integration.",
    price: "Custom pricing",
    turnaround: "24-72 hours",
    accuracy: "99.9%+ legal standard",
    features: [
      "Legal document templates",
      "Ontario Court Forms library",
      "Editable DOCX output",
      "Legal formatting standards",
      "Template merging capabilities",
      "Compliance reporting",
      "Dedicated legal support",
    ],
    bestFor: [
      "Court proceedings",
      "Legal depositions",
      "Client consultations",
      "Legal document preparation",
    ],
    limitations: [
      "Requires legal service tier",
      "Custom pricing based on complexity",
    ]
  },
];

const comparisonFeatures = [
  { feature: "Processing Speed", ai: "5-15 minutes", human: "24-48 hours", hybrid: "2-6 hours", legal: "24-72 hours" },
  { feature: "Accuracy", ai: "99%+", human: "99.9%", hybrid: "99.8%", legal: "99.9%+" },
  { feature: "Complex Audio", ai: "Limited", human: "Excellent", hybrid: "Good", legal: "Excellent" },
  { feature: "Cost", ai: "$0.10/min", human: "$1.50/min", hybrid: "$0.75/min", legal: "Custom" },
  { feature: "Output Format", ai: "Locked PDF", human: "Locked PDF", hybrid: "Locked PDF", legal: "Editable DOCX" },
];

export default function ServicesPage() {
  return (
    <>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-ttt-lavender-light via-white to-ttt-lavender py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Our <span className="text-ttt-navy">Transcription Services</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Choose the perfect transcription service for your needs. From lightning-fast AI processing 
                to specialized legal document production, we have you covered.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {services.map((service) => (
                <Card key={service.id} className="flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0">
                        <service.icon className="h-8 w-8 text-ttt-navy" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-gray-900">{service.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {service.turnaround}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-4 w-4" />
                            {service.accuracy}
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-ttt-navy">{service.price}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-6 flex-1">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Key Features</h4>
                        <ul className="space-y-2">
                          {service.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-ttt-navy mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Best For</h4>
                        <ul className="space-y-1">
                          {service.bestFor.map((use, index) => (
                            <li key={index} className="text-sm text-gray-600">• {use}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {service.limitations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Considerations</h4>
                          <ul className="space-y-1">
                            {service.limitations.map((limitation, index) => (
                              <li key={index} className="text-sm text-gray-500">• {limitation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-8">
                      <Link href={service.id === 'legal' ? '/contact' : '/register'}>
                        <Button 
                          className="w-full gap-x-2" 
                          variant={service.id === 'ai' ? 'navy' : 'outline'}
                        >
                          {service.id === 'legal' ? 'Contact Sales' : 'Get Started'}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Service Comparison
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Compare our services side-by-side to find the perfect match for your needs.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">AI Transcription</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Human Verified</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hybrid</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">LegalScript</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.feature}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{row.ai}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{row.human}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{row.hybrid}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{row.legal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Our streamlined process ensures fast, accurate, and secure transcription delivery.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ttt-navy text-white">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload</h3>
                <p className="text-sm text-gray-600">
                  Upload your audio files securely through our encrypted platform
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ttt-navy text-white">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Process</h3>
                <p className="text-sm text-gray-600">
                  AI or human transcribers convert your audio to text with high accuracy
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ttt-navy text-white">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Review</h3>
                <p className="text-sm text-gray-600">
                  Quality assurance and formatting ensure professional results
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ttt-navy text-white">
                  <span className="text-xl font-bold">4</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Deliver</h3>
                <p className="text-sm text-gray-600">
                  Receive your transcript in the appropriate format via secure download
                </p>
              </div>
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
                Try our platform with 3 free uploads or contact us to discuss your specific requirements.
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