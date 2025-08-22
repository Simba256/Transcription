'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  User, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Key
} from 'lucide-react';
import Header from '@/components/shared/header';
import RoleManagementService from '@/lib/role-management';

export default function AdminSetupPage() {
  const { user, userProfile } = useAuth();
  const [adminKey, setAdminKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.roles?.includes('admin');
  
  // Simple admin key for demo purposes - in production, this would be more secure
  const ADMIN_SETUP_KEY = 'admin123';

  const handleSetupAdmin = async () => {
    if (!user) return;
    
    if (adminKey !== ADMIN_SETUP_KEY) {
      setMessage({ type: 'error', text: 'Invalid admin setup key' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      await RoleManagementService.assignAdminRole(user.uid);
      setMessage({ 
        type: 'success', 
        text: 'Admin role assigned successfully! Please refresh the page.' 
      });
      
      // Refresh page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to assign admin role' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMakeTranscriber = async () => {
    if (!user) return;

    setProcessing(true);
    setMessage(null);

    try {
      // Mock application data for demo
      const mockApplicationData = {
        fullName: user.displayName || 'Test Transcriber',
        email: user.email!,
        phone: '+1 (555) 123-4567',
        experience: '3-5',
        languages: ['English'],
        specializations: ['General'],
        availableHours: 40,
        timezone: 'EST'
      };

      await RoleManagementService.assignTranscriberRole(user.uid, mockApplicationData);
      setMessage({ 
        type: 'success', 
        text: 'Transcriber role assigned successfully! Please refresh the page.' 
      });
      
      // Refresh page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to assign transcriber role' 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to access admin setup.
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Setup</h1>
            <p className="mt-2 text-gray-600">
              Setup page for development and testing purposes
            </p>
          </div>

          {/* Current Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <span className="font-mono">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Role:</span>
                  <Badge variant={isAdmin ? 'default' : 'secondary'}>
                    {userProfile?.role || 'user'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Is Admin:</span>
                  {isAdmin ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Is Transcriber:</span>
                  {userProfile?.role === 'transcriber' || userProfile?.roles?.includes('transcriber') ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Actions */}
          <div className="space-y-4">
            {!isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Become Admin
                  </CardTitle>
                  <CardDescription>
                    Enter the admin setup key to assign admin role to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="adminKey">Admin Setup Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="adminKey"
                          type="password"
                          placeholder="Enter admin setup key"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                        />
                        <Button 
                          onClick={handleSetupAdmin}
                          disabled={processing || !adminKey.trim()}
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Key className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        For demo purposes: use "admin123"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!(userProfile?.role === 'transcriber' || userProfile?.roles?.includes('transcriber')) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Become Transcriber (Demo)
                  </CardTitle>
                  <CardDescription>
                    Instantly assign transcriber role for testing purposes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleMakeTranscriber}
                    disabled={processing}
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning Role...
                      </>
                    ) : (
                      'Assign Transcriber Role'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Message */}
          {message && (
            <Alert 
              variant={message.type === 'error' ? 'destructive' : 'default'}
              className="mt-6"
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Quick Links */}
          {isAdmin && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Admin Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/admin/transcribers">
                      <User className="h-4 w-4 mr-2" />
                      Manage Transcriber Applications
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/transcriber">
                      <User className="h-4 w-4 mr-2" />
                      View Transcriber Dashboard
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Development Note */}
          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Development Only:</strong> This setup page should be removed in production. 
              In a real application, admin roles would be assigned through secure backend processes.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </>
  );
}