import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

// firebase (make sure Email/Password auth is enabled in your
// Firebase console under Authentication → Sign-in method)
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (firebaseError: any) {
      const code = firebaseError.code || '';
      let msg = 'Failed to sign in';
      switch (code) {
        case 'auth/user-not-found':
          msg = 'No account found for this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          msg = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
          msg = 'Invalid credential. Make sure you entered the right email/password or create an account.';
          break;
        case 'auth/too-many-requests':
          msg = 'Too many attempts. Please wait before trying again.';
          break;
        default:
          msg = firebaseError.message || msg;
      }
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-2xl">ElderCare</h1>
            <p className="text-sm text-gray-600">Mood Monitor System</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Sign in to access the caregiver dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}{' '}
                  {error.toLowerCase().includes('sign up') && (
                    <Link to="/signup" className="underline font-medium">
                      Create an account
                    </Link>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="caregiver@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 text-base h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 text-base h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" className="w-full text-base h-11">
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          © 2026 ElderCare System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
