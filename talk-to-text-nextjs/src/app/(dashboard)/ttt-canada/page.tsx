'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Star,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';
import TTTCanadaUpload from '@/components/ttt-canada/TTTCanadaUpload';
import JobProgressTracker from '@/components/ttt-canada/JobProgressTracker';
import { TTT_CANADA_PRICING, TTT_CANADA_ADDONS, creditsToCad } from '@/lib/stripe';

export default function TTTCanadaPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);\n  const [loadingOrders, setLoadingOrders] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('services');

  const handleUploadSuccess = (result: any) => {
    setUploadSuccess(result);
    setActiveTab('orders');
    
    // Show appropriate message based on service completion state
    if (result.backgroundProcessing) {
      console.log('Job created successfully, processing in background');
    }
    
    // Refresh orders from backend and user profile stats
    loadOrders();
    refreshProfile();
  };

  const handleJobComplete = (completedJob: any) => {
    // Update the job in orders list when background processing completes
    setOrders(prev => prev.map(order => 
      order.jobId === completedJob.jobId 
        ? { ...order, ...completedJob, isCompleted: true }
        : order
    ));
    
    // Refresh user profile to update usage stats
    refreshProfile();
  };

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      setLoadingOrders(true);
      
      // Get Firebase ID token for authentication
      const token = await user.getIdToken();
      
      const response = await fetch('/api/ttt-canada/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data.orders || []);
      
      console.log(`📋 Loaded ${data.orders?.length || 0} TTT Canada orders`);
      
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load orders on component mount and when user changes
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const services = [
    {
      id: 'ai_human_review',
      name: 'AI Draft + Human Review',
      price: `${TTT_CANADA_PRICING.ai_human_review} credits/min`,
      icon: <FileText className="h-6 w-6" />,
      description: 'Two-phase workflow: AI draft delivered immediately, then human-reviewed final transcript within 48 hours',
      features: ['AI draft available instantly', 'Human review within 48h', '99%+ final accuracy', 'Canadian English spelling'],
      recommended: true
    },
    {
      id: 'verbatim_multispeaker',
      name: 'Verbatim Multi-Speaker',
      price: `${TTT_CANADA_PRICING.verbatim_multispeaker} credits/min`,
      icon: <Users className="h-6 w-6" />,
      description: 'Complete verbatim with speaker identification',
      features: ['All filler words included', 'Clear speaker labels', 'Non-verbal annotations', 'Legal proceeding ready']
    },
    {
      id: 'indigenous_oral',
      name: 'Indigenous Oral History',
      price: `${TTT_CANADA_PRICING.indigenous_oral} credits/min`,
      icon: <Leaf className="h-6 w-6" />,
      description: 'Culturally sensitive transcription services',
      features: ['Cultural awareness training', 'Respectful formatting', 'Traditional knowledge protocols', 'Elder storytelling expertise']
    },
    {
      id: 'legal_dictation',
      name: 'Legal Dictation',
      price: `${TTT_CANADA_PRICING.legal_dictation} credits/min`,
      icon: <Scale className="h-6 w-6" />,
      description: 'Canadian legal document formatting',
      features: ['Legal terminology accuracy', 'Canadian citation standards', 'Professional legal format', 'Lawyer reviewed']
    }
  ];

  const addOns = [
    {
      id: 'timestamps',
      name: 'Precise Timestamps',
      price: `+${TTT_CANADA_ADDONS.timestamps} credits/min`,
      description: 'Time markers at speaker changes or intervals'
    },
    {
      id: 'anonymization',
      name: 'Privacy & Anonymization',
      price: `+${TTT_CANADA_ADDONS.anonymization} credits/min`,
      description: 'PIPEDA compliant PII removal and redaction'
    },
    {
      id: 'custom_template',
      name: 'Custom Template',
      price: `+${TTT_CANADA_ADDONS.customTemplate} credits setup`,
      description: 'Organization-specific formatting and branding'
    },
    {
      id: 'rush_delivery',
      name: 'Rush Delivery',
      price: `+${TTT_CANADA_ADDONS.rushDelivery} credits/min`,
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="services">Premium Services</TabsTrigger>
              <TabsTrigger value="upload">Upload & Order</TabsTrigger>
              <TabsTrigger value="orders">My Orders {orders.length > 0 && `(${orders.length})`}</TabsTrigger>
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
              {uploadSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Order submitted successfully!</strong> Job ID: {uploadSuccess.jobId}
                    <br />
                    Your transcription will be processed using {uploadSuccess.serviceType.replace('_', ' ')} service.
                  </AlertDescription>
                </Alert>
              )}
              
              <TTTCanadaUpload 
                selectedService={selectedService}
                onUploadSuccess={handleUploadSuccess}
              />
            </TabsContent>

            {/* My Orders Tab */}
            <TabsContent value="orders" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>My TTT Canada Orders</CardTitle>
                  <CardDescription>Track your Canadian transcription projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading your orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                      <p className="text-gray-600 mb-6">
                        Your Canadian transcription orders will appear here
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('upload')}
                      >
                        Upload Your First File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order, index) => {
                        // Show progress tracker for processing jobs
                        if (['processing', 'ai_processing', 'pending_human_review'].includes(order.status)) {
                          return (
                            <JobProgressTracker
                              key={order.jobId || index}
                              jobId={order.jobId}
                              serviceType={order.serviceType}
                              onJobComplete={handleJobComplete}
                            />
                          );
                        }
                        
                        // Show completed job summary
                        return (
                          <Card key={order.jobId || index} className="border-l-4 border-l-red-600">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {order.status === 'pending_human_review' ? (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                      ⏳ Pending Human Review
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      ✅ Completed
                                    </Badge>
                                  )}
                                  <span className="text-sm text-gray-500">
                                    Job ID: {order.jobId}
                                  </span>
                                </div>
                                <h4 className="font-medium">
                                  {order.serviceType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {order.message || 'Transcription completed successfully'}
                                </p>
                                {order.pricing && (
                                  <p className="text-sm font-medium text-red-600">
                                    Total: ${order.pricing.totalCAD.toFixed(2)} CAD 
                                    (${order.pricing.totalUSD.toFixed(2)} USD)
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="mb-2"
                                  onClick={() => {
                                    // Navigate to transcript view or download
                                    console.log('View transcript for job:', order.jobId);
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Transcript
                                </Button>
                                {order.result && (
                                  <div className="text-sm text-gray-500">
                                    {order.result.transcript?.length || 0} characters
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {order.result?.transcript && (
                              <div className="mt-4 p-3 bg-gray-50 rounded border">
                                <h5 className="text-sm font-medium mb-2">Preview:</h5>
                                <p className="text-sm text-gray-700">
                                  {order.result.transcript.substring(0, 200)}
                                  {order.result.transcript.length > 200 && '...'}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  )}
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