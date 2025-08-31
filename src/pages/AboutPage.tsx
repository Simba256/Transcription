"use client";

import React from 'react';
import { Shield, Users, Award, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#003366] to-[#2c3e50] text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About Talk To Text Canada
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              We're dedicated to providing the most accurate, secure, and reliable 
              transcription services for Canadian professionals and businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                At Talk To Text Canada, we believe that accurate transcription shouldn't 
                be a luxury. Our mission is to democratize access to professional-grade 
                transcription services through innovative technology and human expertise.
              </p>
              <p className="text-lg text-gray-600">
                Whether you're a legal professional handling sensitive depositions, 
                a business conducting important meetings, or an individual with personal 
                recordings, we provide the tools and services you need to convert speech 
                to text with confidence.
              </p>
            </div>
            <div className="bg-gray-50 p-12 rounded-xl">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#003366] mb-4">2019</div>
                  <div className="text-lg text-gray-600">Founded</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#003366] mb-4">10k+</div>
                  <div className="text-lg text-gray-600">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#003366] mb-4">99.5%</div>
                  <div className="text-lg text-gray-600">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#003366] mb-4">500+</div>
                  <div className="text-lg text-gray-600">Happy Clients</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Our Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do at Talk To Text Canada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Security</h3>
                <p className="text-gray-600">
                  Your data is protected with enterprise-grade encryption and strict 
                  confidentiality protocols.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Quality</h3>
                <p className="text-gray-600">
                  We maintain the highest standards of accuracy through advanced AI 
                  and expert human review.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#2c3e50] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Service</h3>
                <p className="text-gray-600">
                  Our dedicated support team is here to help you succeed with 
                  personalized assistance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Canadian</h3>
                <p className="text-gray-600">
                  Proudly Canadian-owned and operated, compliant with all local 
                  privacy regulations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Our Expertise
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our team combines cutting-edge technology with human expertise to 
              deliver exceptional results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-[#003366] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">AI</span>
              </div>
              <h3 className="text-xl font-semibold text-[#003366] mb-4">
                Advanced AI Technology
              </h3>
              <p className="text-gray-600">
                Our proprietary AI models are trained specifically for Canadian accents 
                and legal terminology, ensuring superior accuracy.
              </p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#003366] mb-4">
                Expert Transcribers
              </h3>
              <p className="text-gray-600">
                Our certified human transcribers have extensive experience in legal, 
                medical, and business transcription.
              </p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-[#2c3e50] rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#003366] mb-4">
                Security Specialists
              </h3>
              <p className="text-gray-600">
                Our security team ensures all data handling meets the strictest 
                Canadian privacy and compliance standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-[#003366] text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Experience the Difference?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the growing number of Canadian professionals who trust 
            Talk To Text Canada for their transcription needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Get Started Today
            </a>
            <a
              href="/contact"
              className="border border-white text-white hover:bg-white hover:text-[#003366] px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}