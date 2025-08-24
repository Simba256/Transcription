'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  DollarSign,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Eye,
  Upload,
  Leaf,
  Scale,
  Users,
  Copy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TTTCanadaOrder {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  duration?: number;
  serviceType: 'ai_human_review' | 'verbatim_multispeaker' | 'indigenous_oral' | 'legal_dictation' | 'copy_typing';
  status: 'pending' | 'processing' | 'completed' | 'queued_for_admin';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  language: string;
  pricing: {
    basePrice: number;
    totalCAD: number;
    addOns?: Array<{ name: string; price: number; }>;
  };
  clientInstructions?: string;
  specialRequirements?: string;
  adminTranscription?: string;
  adminNotes?: string;
  createdAt: any;
  completedAt?: any;
}

export default function TTTCanadaOrdersPage() {
  const { user, userProfile } = useAuth();
  const [orders, setOrders] = useState<TTTCanadaOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TTTCanadaOrder | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('pending');

  // Check admin permissions
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [userProfile]);

  // Load TTT Canada orders
  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ttt-canada-orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading TTT Canada orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (order: TTTCanadaOrder) => {
    setSelectedOrder(order);
    setTranscriptionText(order.adminTranscription || '');
    setAdminNotes(order.adminNotes || '');
  };

  const handleSubmitOrder = async () => {
    if (!selectedOrder || !transcriptionText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/complete-ttt-canada-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          transcription: transcriptionText.trim(),
          adminNotes: adminNotes.trim(),
          reviewedBy: userProfile?.firstName || user?.displayName || 'Admin'
        }),
      });

      if (response.ok) {
        await loadOrders();
        setSelectedOrder(null);
        setTranscriptionText('');
        setAdminNotes('');
      }
    } catch (error) {
      console.error('Error submitting TTT Canada order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    const icons = {
      'ai_human_review': <Users className="w-4 h-4" />,
      'verbatim_multispeaker': <Users className="w-4 h-4" />,
      'indigenous_oral': <Leaf className="w-4 h-4" />,
      'legal_dictation': <Scale className="w-4 h-4" />,
      'copy_typing': <Copy className="w-4 h-4" />
    };
    return icons[serviceType as keyof typeof icons] || <FileText className="w-4 h-4" />;
  };

  const getServiceName = (serviceType: string) => {
    const names = {
      'ai_human_review': 'AI Draft + Human Review',
      'verbatim_multispeaker': 'Verbatim Multi-Speaker',
      'indigenous_oral': 'Indigenous Oral History',
      'legal_dictation': 'Legal Dictation',
      'copy_typing': 'Copy Typing'
    };
    return names[serviceType as keyof typeof names] || serviceType;
  };

  const getStatusBadge = (status: string, priority: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'processing': { color: 'bg-blue-100 text-blue-800', text: 'Processing' },
      'queued_for_admin': { color: 'bg-orange-100 text-orange-800', text: 'Queued for Admin' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' }
    };

    const priorityConfig = {
      'urgent': { color: 'bg-red-100 text-red-800' },
      'high': { color: 'bg-orange-100 text-orange-800' },
      'normal': { color: 'bg-gray-100 text-gray-800' },
      'low': { color: 'bg-green-100 text-green-800' }
    };

    return (
      <div className="flex gap-2">
        <Badge className={statusConfig[status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}>
          {statusConfig[status as keyof typeof statusConfig]?.text || status}
        </Badge>
        {priority && (
          <Badge variant="outline" className={priorityConfig[priority as keyof typeof priorityConfig]?.color || 'bg-gray-100 text-gray-800'}>
            {priority.toUpperCase()}
          </Badge>
        )}
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading TTT Canada orders...</p>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return order.status === 'pending' || order.status === 'queued_for_admin';
    if (filter === 'processing') return order.status === 'processing';
    if (filter === 'completed') return order.status === 'completed';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">TTT Canada Orders</h1>
        </div>
        <p className="text-gray-600">Manage Canadian specialized transcription services</p>
      </div>

      {/* Filter and Stats */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending ({orders.filter(o => ['pending', 'queued_for_admin'].includes(o.status)).length})
          </Button>
          <Button 
            variant={filter === 'processing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('processing')}
          >
            Processing ({orders.filter(o => o.status === 'processing').length})
          </Button>
          <Button 
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed ({orders.filter(o => o.status === 'completed').length})
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </Button>
        </div>
        
        <Button onClick={loadOrders} variant="outline" size="sm">
          Refresh Orders
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                TTT Canada Orders ({filteredOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No orders found</p>
                ) : (
                  filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleOrderSelect(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm truncate">{order.fileName}</h4>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(order.pricing.totalCAD)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {getServiceIcon(order.serviceType)}
                        <span className="text-xs text-gray-600">{getServiceName(order.serviceType)}</span>
                      </div>
                      
                      {getStatusBadge(order.status, order.priority)}
                      
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Duration: {formatDuration(order.duration)}</p>
                        <p>Created: {formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details and Processing */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="space-y-6">
              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {getServiceIcon(selectedOrder.serviceType)}
                      {selectedOrder.fileName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(selectedOrder.pricing.totalCAD)}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(selectedOrder.fileUrl, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="font-medium text-gray-700">Service Type</p>
                      <p className="text-gray-600">{getServiceName(selectedOrder.serviceType)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Duration</p>
                      <p className="text-gray-600">{formatDuration(selectedOrder.duration)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Language</p>
                      <p className="text-gray-600">{selectedOrder.language?.toUpperCase() || 'EN'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Created</p>
                      <p className="text-gray-600">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Pricing Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Price ({getServiceName(selectedOrder.serviceType)})</span>
                        <span>{formatCurrency(selectedOrder.pricing.basePrice)}</span>
                      </div>
                      {selectedOrder.pricing.addOns?.map((addon, index) => (
                        <div key={index} className="flex justify-between text-gray-600">
                          <span>{addon.name}</span>
                          <span>{formatCurrency(addon.price)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-1 flex justify-between font-medium">
                        <span>Total (CAD)</span>
                        <span>{formatCurrency(selectedOrder.pricing.totalCAD)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Client Instructions */}
                  {selectedOrder.clientInstructions && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Client Instructions</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {selectedOrder.clientInstructions}
                      </p>
                    </div>
                  )}

                  {/* Special Requirements */}
                  {selectedOrder.specialRequirements && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Special Requirements</h4>
                      <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">
                        {selectedOrder.specialRequirements}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transcription Interface */}
              <Card>
                <CardHeader>
                  <CardTitle>Canadian Specialized Transcription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transcription Text *
                    </label>
                    <Textarea
                      value={transcriptionText}
                      onChange={(e) => setTranscriptionText(e.target.value)}
                      placeholder="Enter the specialized Canadian transcription here..."
                      rows={12}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes
                    </label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about Canadian service requirements, cultural considerations, etc..."
                      rows={3}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSubmitOrder}
                      disabled={!transcriptionText.trim() || isSubmitting}
                      className="flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Complete Order
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(null);
                        setTranscriptionText('');
                        setAdminNotes('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a TTT Canada Order</h3>
                  <p className="text-gray-600">Choose an order from the list to process Canadian specialized transcription services</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}