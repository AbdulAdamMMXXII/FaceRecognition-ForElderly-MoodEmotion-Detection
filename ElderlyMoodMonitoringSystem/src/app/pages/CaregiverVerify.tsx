import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  caregiver?: {
    name: string;
    email: string;
    verified: boolean;
    verifiedAt: string;
  };
}

export default function CaregiverVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [caregiverName, setCaregiverName] = useState<string>('');
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    const token = params.get('token');
    if (!uid || !token) {
      setStatus('error');
      setMessage('Missing verification parameters. Please check the link in your email.');
      return;
    }
    const run = async () => {
      setStatus('loading');
      try {
        // Use relative URL so it works both locally (via Vite proxy) and in production (via Firebase Hosting rewrite)
        const url = `/api/verifyCaregiver?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        
        let data: VerificationResponse | null = null;
        
        try {
          data = await res.json();
        } catch (e) {
          // Fallback if response is not JSON
          const text = await res.text();
          data = { success: !res.ok, error: text || 'Unknown response' };
        }
        
        if (!data?.success) {
          setStatus('error');
          setMessage(data?.error || 'Verification failed. The link may have expired or is invalid.');
          return;
        }
        
        // Success!
        setStatus('success');
        setMessage(data.message || 'Your caregiver access has been successfully verified!');
        
        if (data.caregiver) {
          setCaregiverName(data.caregiver.name || 'Caregiver');
          setCaregiverEmail(data.caregiver.email || '');
        }
        
        // Auto-close after 5 seconds
        setAutoCloseCountdown(5);
      } catch (err: any) {
        setStatus('error');
        setMessage('Verification error: ' + (err?.message || String(err)));
      }
    };
    run();
  }, [location.search]);

  // Auto-close countdown
  useEffect(() => {
    if (status !== 'success' || autoCloseCountdown === 0) return;
    
    const timer = setTimeout(() => {
      setAutoCloseCountdown(autoCloseCountdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [autoCloseCountdown, status]);

  // Auto-close when countdown reaches 0
  useEffect(() => {
    if (autoCloseCountdown === 0 && status === 'success') {
      // Try to close the window, fall back to home if not possible
      if (window.opener) {
        window.close();
      } else {
        navigate('/');
      }
    }
  }, [autoCloseCountdown, status, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {status === 'loading' && <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />}
              {status === 'success' && <CheckCircle className="w-16 h-16 text-green-600" />}
              {status === 'error' && <XCircle className="w-16 h-16 text-red-600" />}
            </div>
            <CardTitle className="text-2xl">
              {status === 'loading' && 'Verifying Your Access...'}
              {status === 'success' && 'Verification Successful!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {status === 'loading' && 'Please wait while we confirm your caregiver access'}
              {status === 'success' && 'You are now registered as a caregiver'}
              {status === 'error' && 'Unable to complete verification'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className={`p-6 rounded-lg mb-6 ${
              status === 'success' ? 'bg-green-50 border border-green-200' : 
              status === 'error' ? 'bg-red-50 border border-red-200' : 
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-base font-medium ${
                status === 'success' ? 'text-green-800' : 
                status === 'error' ? 'text-red-800' : 
                'text-blue-800'
              }`}>
                {message}
              </p>
            </div>

            {status === 'success' && caregiverName && (
              <div className="space-y-4 text-left mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-lg">Verification Confirmed</h3>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium">Name:</span> {caregiverName}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {caregiverEmail}</p>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <h4 className="font-semibold text-sm mb-2">What happens next?</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>You will receive notifications for concerning mood patterns</li>
                    <li>Regular summary reports will be sent on schedule</li>
                    <li>Check your email for further instructions</li>
                  </ul>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  This tab will close automatically in <span className="font-bold text-foreground">{autoCloseCountdown}</span> seconds...
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => {
                      if (window.opener) {
                        window.close();
                      } else {
                        navigate('/');
                      }
                    }} 
                    className="px-6"
                  >
                    Close This Tab
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4 text-left mb-6">
                <h3 className="font-semibold text-lg">Troubleshooting:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Verification links expire after 24 hours</li>
                  <li>Each link can only be used once</li>
                  <li>Ask the elderly person to request a new verification link</li>
                  <li>Check your email spam folder if you didn't receive the original email</li>
                </ul>
              </div>
            )}

            {status === 'error' && (
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="outline"
                  className="px-6"
                >
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
