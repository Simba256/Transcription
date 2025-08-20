import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/shared/header";
import Footer from "@/components/shared/footer";

const contactMethods = [
  {
    name: "Email Support",
    description: "Get help via email",
    icon: Mail,
    contact: "support@talktotextcanada.com",
    hours: "Responses within 24 hours",
  },
  {
    name: "Phone Support", 
    description: "Speak with our team",
    icon: Phone,
    contact: "1-800-TTT-CANADA",
    hours: "Mon-Fri 9AM-6PM EST",
  },
  {
    name: "Live Chat",
    description: "Chat with support",
    icon: MessageSquare,
    contact: "Available on website",
    hours: "Mon-Fri 9AM-6PM EST",
  },
];

const offices = [
  {
    city: "Toronto",
    address: "123 Business District\nToronto, ON M5V 3A1",
    phone: "+1 (416) 555-0123",
    email: "toronto@talktotextcanada.com",
  },
  {
    city: "Vancouver",
    address: "456 Tech Hub Lane\nVancouver, BC V6B 1A1", 
    phone: "+1 (604) 555-0456",
    email: "vancouver@talktotextcanada.com",
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-ttt-lavender-light via-white to-ttt-lavender py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Contact <span className="text-ttt-navy">Talk to Text Canada</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Have questions about our transcription services? Need a custom solution? 
                We're here to help you find the perfect transcription solution.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Get in Touch
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Choose the contact method that works best for you.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {contactMethods.map((method) => (
                <Card key={method.name} className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ttt-navy text-white">
                      <method.icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl">{method.name}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-ttt-navy mb-2">{method.contact}</p>
                    <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" />
                      {method.hours}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Form */}
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">
                  Send us a message
                </h2>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        First name
                      </label>
                      <Input id="firstName" name="firstName" type="text" required />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Last name
                      </label>
                      <Input id="lastName" name="lastName" type="text" required />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company (optional)
                    </label>
                    <Input id="company" name="company" type="text" />
                  </div>
                  
                  <div>
                    <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                      Service Interest
                    </label>
                    <select 
                      id="service" 
                      name="service" 
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select a service</option>
                      <option value="ai">AI Transcription</option>
                      <option value="human">Human Transcription</option>
                      <option value="hybrid">Hybrid (AI + Human)</option>
                      <option value="legal">LegalScript Studio</option>
                      <option value="custom">Custom Solution</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Tell us about your transcription needs..."
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full gap-x-2" variant="navy">
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">
                  Contact Information
                </h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-ttt-navy" />
                        <span className="text-gray-600">support@talktotextcanada.com</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-ttt-navy" />
                        <span className="text-gray-600">1-800-TTT-CANADA</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-ttt-navy" />
                        <span className="text-gray-600">Monday - Friday: 9AM - 6PM EST</span>
                      </div>
                    </div>
                  </div>

                  {/* Office Locations */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Office Locations</h3>
                    <div className="space-y-6">
                      {offices.map((office) => (
                        <div key={office.city} className="border-l-4 border-ttt-navy pl-4">
                          <h4 className="font-semibold text-gray-900">{office.city}</h4>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 text-ttt-navy flex-shrink-0" />
                              <span className="whitespace-pre-line">{office.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-ttt-navy" />
                              <span>{office.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-ttt-navy" />
                              <span>{office.email}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Business Hours */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Business Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monday - Friday</span>
                          <span className="font-medium">9:00 AM - 6:00 PM EST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Saturday</span>
                          <span className="font-medium">10:00 AM - 4:00 PM EST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sunday</span>
                          <span className="font-medium">Closed</span>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-ttt-lavender-light rounded-lg">
                        <p className="text-xs text-gray-600">
                          Email support is available 24/7. We typically respond within 24 hours.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Quick answers to common questions. Can't find what you're looking for? Contact us directly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How quickly can I get my transcription?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    AI transcription: 5-15 minutes. Human verification: 24-48 hours. 
                    Hybrid service: 2-6 hours. LegalScript Studio: 24-72 hours.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What file formats do you accept?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We accept MP3, WAV, M4A, and most common audio formats. 
                    Maximum file size is 100MB per file.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is my data secure?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes! We use bank-level encryption, Canadian data residency, 
                    and comply with all privacy regulations. Your files are never shared.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Do you offer volume discounts?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we offer custom pricing for high-volume customers. 
                    Contact our sales team to discuss your requirements.
                  </p>
                </CardContent>
              </Card>
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
                Try our platform with 3 free uploads or contact us to discuss your specific needs.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button size="lg" variant="secondary" asChild>
                  <a href="/trial">Start Free Trial</a>
                </Button>
                <a href="mailto:support@talktotextcanada.com" className="text-sm font-semibold leading-6 text-white">
                  Email us directly <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}