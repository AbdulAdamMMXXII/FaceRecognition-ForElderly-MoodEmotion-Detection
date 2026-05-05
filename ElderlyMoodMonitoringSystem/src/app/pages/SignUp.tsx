import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Heart, Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

// firebase
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { createUserProfile } from '../services/firestore';

export function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.age || isNaN(Number(formData.age))) {
      setError('Please provide a valid age');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      // store extra profile information in Firestore (use auth uid as id)
      if (credential.user) {
        await createUserProfile(credential.user.uid, {
          id: credential.user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          age: Number(formData.age),
          photo: '',
          monitoringStatus: 'active',
          deviceStatus: 'online',
          lastActivity: new Date(),
          emergencyContact: {
            name: formData.emergencyName || '',
            phone: formData.emergencyPhone || formData.phone || '',
            relationship: formData.emergencyRelationship || ''
          }
        });
      }
      navigate('/');
    } catch (firebaseError: any) {
      setError(firebaseError.message || 'Failed to create account');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription className="text-base">
              Sign up to start monitoring elderly well-being
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="pl-10 text-base h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="caregiver@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="pl-10 text-base h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+44 7700 900123"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="pl-10 text-base h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="text-base">Age *</Label>
                <div className="relative">
                  <Input
                    id="age"
                    type="number"
                    placeholder="75"
                    value={formData.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    className="pl-3 text-base h-11"
                  />
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-700">Emergency contact (optional)</div>
              <div className="space-y-2">
                <Label htmlFor="emergencyName" className="text-base">Name</Label>
                <Input
                  id="emergencyName"
                  type="text"
                  placeholder="Jane Doe"
                  value={formData.emergencyName}
                  onChange={(e) => handleChange('emergencyName', e.target.value)}
                  className="text-base h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-base">Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  placeholder="+44 7700 900999"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                  className="text-base h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship" className="text-base">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  type="text"
                  placeholder="Daughter"
                  value={formData.emergencyRelationship}
                  onChange={(e) => handleChange('emergencyRelationship', e.target.value)}
                  className="text-base h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="pl-10 text-base h-11"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full text-base h-11">
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
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
