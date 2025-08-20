import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const navigation = {
  services: [
    { name: "AI Transcription", href: "/services#ai" },
    { name: "Human Transcription", href: "/services#human" },
    { name: "Hybrid Service", href: "/services#hybrid" },
    { name: "LegalScript Studio", href: "/services#legal" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Pricing", href: "/pricing" },
    { name: "Contact", href: "/contact" },
    { name: "Blog", href: "/blog" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/legal/privacy" },
    { name: "Terms of Service", href: "/legal/terms" },
    { name: "Non-Disclosure Agreement", href: "/legal/nda" },
    { name: "Accessibility", href: "/legal/accessibility" },
  ],
  support: [
    { name: "Help Center", href: "/support" },
    { name: "Documentation", href: "/docs" },
    { name: "API Reference", href: "/api-docs" },
    { name: "Status", href: "/status" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-ttt-navy text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Company info */}
          <div className="space-y-8">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-ttt-navy font-bold text-sm">TTT</span>
              </div>
              <span className="text-xl font-bold">Talk to Text Canada</span>
            </div>
            <p className="text-sm leading-6 text-gray-300">
              Secure voice-to-text transcription services built for Canadians. 
              Professional AI-powered transcription with legal document production capabilities.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-300" />
                <span className="text-sm text-gray-300">support@talktotextcanada.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-300" />
                <span className="text-sm text-gray-300">1-800-TTT-CANADA</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-300" />
                <span className="text-sm text-gray-300">Toronto, Ontario, Canada</span>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6">Services</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.services.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6">Company</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.support.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              {/* Add social media links here if needed */}
            </div>
            <p className="mt-8 text-xs leading-5 text-gray-400 md:order-1 md:mt-0">
              &copy; {new Date().getFullYear()} Talk to Text Canada. All rights reserved. 
              Built with security and privacy in mind for Canadian businesses.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;