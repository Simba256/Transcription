'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Clock, 
  DollarSign, 
  Users, 
  MapPin,
  Scale,
  GraduationCap,
  Leaf,
  Building,
  Star
} from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';

export default function TTTCanadaPage() {
  const { user, userProfile } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    {
      id: 'ai_human_review',
      name: 'AI Draft + Human Review',
      price: '$1.75 CAD/min',
      icon: <FileText className="h-6 w-6" />,
      description: 'AI transcription with professional human editing',
      features: ['99%+ accuracy guarantee', '48-hour delivery', 'Canadian English spelling', 'Professional formatting'],
      recommended: true
    },
    {
      id: 'verbatim_multispeaker',
      name: 'Verbatim Multi-Speaker',
      price: '$2.25 CAD/min',
      icon: <Users className="h-6 w-6" />,
      description: 'Complete verbatim with speaker identification',
      features: ['All filler words included', 'Clear speaker labels', 'Non-verbal annotations', 'Legal proceeding ready']
    },
    {
      id: 'indigenous_oral',
      name: 'Indigenous Oral History',
      price: '$2.50 CAD/min',
      icon: <Leaf className="h-6 w-6" />,
      description: 'Culturally sensitive transcription services',
      features: ['Cultural awareness training', 'Respectful formatting', 'Traditional knowledge protocols', 'Elder storytelling expertise']
    },
    {
      id: 'legal_dictation',
      name: 'Legal Dictation',
      price: '$1.85 CAD/min',
      icon: <Scale className="h-6 w-6" />,
      description: 'Canadian legal document formatting',
      features: ['Legal terminology accuracy', 'Canadian citation standards', 'Professional legal format', 'Lawyer reviewed']
    }
  ];

  const addOns = [
    {
      id: 'timestamps',
      name: 'Precise Timestamps',
      price: '+$0.25 CAD/min',
      description: 'Time markers at speaker changes or intervals'
    },
    {
      id: 'anonymization',
      name: 'Privacy & Anonymization',
      price: '+$0.35 CAD/min',
      description: 'PIPEDA compliant PII removal and redaction'
    },
    {
      id: 'custom_template',
      name: 'Custom Template',
      price: '+$25 CAD setup',
      description: 'Organization-specific formatting and branding'
    },
    {
      id: 'rush_delivery',
      name: 'Rush Delivery',
      price: '+$0.50 CAD/min',
      description: '24-hour delivery guarantee'
    }
  ];

  const specializedAreas = [
    {
      name: 'Legal Services',
      icon: <Scale className="h-5 w-5" />,
      services: ['Legal Dictation', 'Discovery Transcripts', 'Court Proceedings', 'Client Intake']
    },
    {
      name: 'Academic & Research',
      icon: <GraduationCap className="h-5 w-5" />,
      services: ['Research Interviews', 'Focus Groups', 'Oral History', 'Thesis Support']
    },
    {
      name: 'Indigenous & Cultural',
      icon: <Leaf className="h-5 w-5" />,
      services: ['Oral Traditions', 'Language Documentation', 'Community Consultations', 'Truth & Reconciliation']
    },
    {
      name: 'Corporate & Business',
      icon: <Building className="h-5 w-5" />,
      services: ['Meeting Minutes', 'Training Materials', 'Market Research', 'Internal Communications']
    }
  ];

  return (
    <>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-red-600" />
              <h1 className="text-4xl font-bold text-gray-900">TalkToText Canada</h1>
              <MapPin className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Premium transcription services for Canadian legal, academic, and Indigenous communities. 
              Culturally aware, legally compliant, and academically rigorous.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span className="text-red-600">🍁</span>
                <span>PIPEDA Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600">⚖️</span>
                <span>Legal Standards</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600">🎓</span>
                <span>Academic Excellence</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="services" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="services">Premium Services</TabsTrigger>
              <TabsTrigger value="upload">Upload & Order</TabsTrigger>
              <TabsTrigger value="orders">My Orders</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            {/* Premium Services Tab */}
            <TabsContent value="services" className="space-y-8">
              
              {/* Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedService === service.id ? 'ring-2 ring-red-600' : ''
                    } ${service.recommended ? 'ring-1 ring-yellow-400' : ''}`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            {service.icon}
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {service.name}
                              {service.recommended && (
                                <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  <Star className="h-3 w-3 mr-1" />
                                  Popular
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>{service.description}</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">{service.price}</div>
                          <div className="text-xs text-gray-500">per audio minute</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {service.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add-Ons Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Premium Add-Ons</CardTitle>
                  <CardDescription>Enhance your transcription with specialized services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addOns.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="font-medium">{addon.name}</div>
                          <div className="text-sm text-gray-600">{addon.description}</div>
                        </div>
                        <div className="text-sm font-medium text-red-600">{addon.price}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Specialized Areas */}
              <Card>
                <CardHeader>
                  <CardTitle>Specialized Service Areas</CardTitle>
                  <CardDescription>Expert transcription for specific Canadian sectors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {specializedAreas.map((area, index) => (
                      <div key={index} className="text-center">
                        <div className="p-3 bg-red-50 rounded-lg w-fit mx-auto mb-3 text-red-600">
                          {area.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{area.name}</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {area.services.map((service, serviceIndex) => (
                            <li key={serviceIndex}>{service}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Upload & Order Tab */}
            <TabsContent value="upload" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Your Files</CardTitle>
                  <CardDescription>
                    Upload audio files and select your preferred Canadian transcription service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">TTT Canada Upload Portal</h3>
                    <p className="text-gray-600 mb-6">
                      Drag & drop your audio files or click to browse
                    </p>
                    <Button className="bg-red-600 hover:bg-red-700">
                      Choose Files
                    </Button>
                    
                    <div className="mt-8 text-left max-w-md mx-auto">
                      <h4 className="font-medium mb-2">Supported formats:</h4>
                      <p className="text-sm text-gray-600">
                        MP3, WAV, M4A, MP4, FLAC, and 15+ other audio/video formats
                      </p>
                      
                      <h4 className="font-medium mb-2 mt-4">Security:</h4>
                      <p className="text-sm text-gray-600">
                        256-bit encryption, PIPEDA compliant storage, secure Canadian servers
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Orders Tab */}
            <TabsContent value="orders" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>My TTT Canada Orders</CardTitle>
                  <CardDescription>Track your Canadian transcription projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-6">
                      Your Canadian transcription orders will appear here
                    </p>
                    <Button variant="outline">
                      Upload Your First File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Templates</CardTitle>
                  <CardDescription>
                    Canadian legal, academic, and organizational document templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                      <Scale className="h-8 w-8 mx-auto mb-3 text-red-600" />
                      <h3 className="font-medium mb-2">Legal Templates</h3>
                      <p className="text-sm text-gray-600">Court documents, legal memos, depositions</p>
                    </div>
                    
                    <div className="border rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                      <GraduationCap className="h-8 w-8 mx-auto mb-3 text-red-600" />
                      <h3 className="font-medium mb-2">Academic Templates</h3>
                      <p className="text-sm text-gray-600">Research interviews, thesis transcripts</p>
                    </div>
                    
                    <div className="border rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                      <Building className="h-8 w-8 mx-auto mb-3 text-red-600" />
                      <h3 className="font-medium mb-2">Corporate Templates</h3>
                      <p className="text-sm text-gray-600">Meeting minutes, training materials</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Custom Template Setup:</strong> $25 CAD one-time fee. 
                      Contact us to create templates matching your organization's specific formatting requirements.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </>
  );
}