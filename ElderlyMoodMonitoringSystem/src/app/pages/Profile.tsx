import { User, Phone, Heart, Activity, Wifi, Calendar, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, subscribeToUserProfile, createUserProfile, requestCaregiverVerification } from '../services/firestore';
import { Button } from '../components/ui/button';
import type { ElderlyProfile } from '../types';

export function Profile() {
  // undefined = loading, null = no profile found, ElderlyProfile = loaded
  const [profile, setProfile] = useState<ElderlyProfile | null | undefined>(undefined);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // one‑time fetch
    (async () => {
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } catch (err) {
        console.error('Failed to load profile:', err);
        // show empty state instead of staying in loading
        setProfile(null);
      }
    })();
    // realtime updates
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      // callback may provide null if the doc is missing or on permission errors
      setProfile(p as any);
    });
    return unsub;
  }, [user]);

  // Visible create profile action (user-triggered) replaces auto-create behavior
  const [creatingProfile, setCreatingProfile] = useState(false);

  // settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themePref, setThemePref] = useState<'light' | 'dark' | 'system'>('system');
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setThemePref(profile.preferences?.theme || 'system');
    setLargeText(Boolean(profile.preferences?.largeText));
  }, [profile]);

  // caregiver form state
  const [cgName, setCgName] = useState('');
  const [cgEmail, setCgEmail] = useState('');
  const [notifyAfterCount, setNotifyAfterCount] = useState<number>(3);
  const [notifyConsecutiveCount, setNotifyConsecutiveCount] = useState<number>(2);
  const [summaryFrequency, setSummaryFrequency] = useState<string>('weekly-monday');
  const [isRequestingCaregiver, setIsRequestingCaregiver] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);

  const formatDateSafe = (value: unknown) => {
    if (!value) return 'Not available';
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return 'Not available';
    return format(date, 'PPp');
  };

  if (profile === undefined) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile…</div>;
  }

  if (profile === null) {
    const handleCreate = async () => {
      if (!user) return;
      setCreatingProfile(true);
      try {
        const email = user.email || '';
        const defaultProfile = {
          id: user.uid,
          name: email.split('@')[0] || 'User',
          email,
          phone: '',
          age: 0,
          photo: '',
          monitoringStatus: 'active',
          deviceStatus: 'online',
          lastActivity: new Date()
        };
        await createUserProfile(user.uid, defaultProfile);
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } catch (err) {
        console.error('Create profile failed:', err);
        alert('Failed to create profile: ' + (err as any)?.message || String(err));
      } finally {
        setCreatingProfile(false);
      }
    };

    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>No profile found</CardTitle>
              <CardDescription>If you just signed up, give the system a moment to provision your profile.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">No profile found for this user.</p>
              <p className="text-sm text-muted-foreground mb-6">Create a minimal profile now to continue testing features like Reports, Analytics and Caregiver notifications.</p>
              <div className="flex justify-center">
                <Button onClick={handleCreate} disabled={creatingProfile}>{creatingProfile ? 'Creating…' : 'Create Profile'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-foreground">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">User Profile</h1>
              <p className="text-muted-foreground text-lg">
                Elderly person's profile and monitoring information
              </p>
            </div>
            <div>
              <Button onClick={() => setSettingsOpen((s) => !s)} className="h-10">
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Overview */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Profile Photo */}
              <div className="flex-shrink-0">
                <ImageWithFallback
                  src={profile.photo}
                  alt={profile.name}
                  className="w-40 h-40 rounded-full object-cover border-4 border-border"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-semibold text-foreground mb-2">
                      {profile.name}
                    </h2>
                    <p className="text-xl text-muted-foreground">
                      {Math.max(0, Number(profile.age) || 0)} years old
                    </p>
                    {profile.latestMood && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Latest mood: <strong className="capitalize">{profile.latestMood.emotion}</strong> — {Math.round(profile.latestMood.confidence * 100)}% ({formatDateSafe(profile.latestMood.timestamp)})
                      </p>
                    )}
                    {profile.latestExplanation?.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Latest AI explanation: {profile.latestExplanation.message}
                        {profile.latestExplanation.source ? ` (source: ${profile.latestExplanation.source}` : ''}
                        {profile.latestExplanation.modelUsed ? `, model: ${profile.latestExplanation.modelUsed}` : ''}
                        {profile.latestExplanation.source ? ')' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge 
                      variant={profile.monitoringStatus === 'active' ? 'default' : 'secondary'}
                      className="text-base px-3 py-1"
                    >
                      {profile.monitoringStatus}
                    </Badge>
                    <Badge 
                      variant={profile.deviceStatus === 'online' ? 'default' : 'destructive'}
                      className="text-base px-3 py-1"
                    >
                      {profile.deviceStatus}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-3 text-base">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-medium text-foreground">{profile.id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-base">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{profile.email || user?.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-base">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium text-foreground">{profile.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-base">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Activity:</span>
                    <span className="font-medium text-foreground">
                      {formatDateSafe(profile.lastActivity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Settings panel (simple inline drawer) */}
          {settingsOpen && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Accessibility & Preferences</CardTitle>
                <CardDescription>Adjust theme and accessibility settings for this profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Theme</p>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={themePref === 'light'}
                          onChange={() => setThemePref('light')}
                        />
                        <span>Light</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={themePref === 'dark'}
                          onChange={() => setThemePref('dark')}
                        />
                        <span>Dark</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="theme"
                          value="system"
                          checked={themePref === 'system'}
                          onChange={() => setThemePref('system')}
                        />
                        <span>System</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} />
                      <span>Use larger text for readability</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!user) return;
                        await createUserProfile(user.uid, { preferences: { theme: themePref, largeText } });
                        const html = document.documentElement;
                        if (themePref === 'dark') html.classList.add('dark');
                        else html.classList.remove('dark');
                        if (largeText) html.classList.add('large-text');
                        else html.classList.remove('large-text');
                        setSettingsOpen(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Emergency Contact */}
          {profile.emergencyContact ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Phone className="w-5 h-5" />
                  Emergency Contact
                </CardTitle>
                <CardDescription className="text-base">
                  Primary contact for urgent situations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="text-lg font-medium text-foreground">
                    {profile.emergencyContact.name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Relationship</p>
                  <p className="text-lg font-medium text-foreground">
                    {profile.emergencyContact.relationship || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                  <p className="text-lg font-medium text-foreground">
                    {profile.emergencyContact.phone || 'Not provided'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Phone className="w-5 h-5" />
                  Emergency Contact
                </CardTitle>
                <CardDescription className="text-base">
                  Primary contact for urgent situations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No emergency contact information provided.</p>
              </CardContent>
            </Card>
          )}

          {/* Caregiver (new feature) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="w-5 h-5" />
                Caregiver Notification
              </CardTitle>
              <CardDescription className="text-base">
                Add a caregiver to receive notifications and summary reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.caregiver && !showChangeForm ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Caregiver</p>
                  <p className="text-lg font-medium text-foreground">{profile.caregiver.name}</p>
                  <p className="text-sm text-muted-foreground">{profile.caregiver.email}</p>
                  <p className="text-sm text-muted-foreground">Summary frequency: {profile.caregiver.summaryFrequency || 'Not set'}</p>
                  <p className="text-sm text-muted-foreground">Notifications: after {profile.caregiver.notifyAfterCount || 3} negative results; {profile.caregiver.notifyConsecutiveCount || 2} consecutive negatives on same day</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        // show change form pre-filled but DO NOT delete existing caregiver
                        if (!user) return;
                        setCgName(profile.caregiver.name || '');
                        setCgEmail(profile.caregiver.email || '');
                        setNotifyAfterCount(profile.caregiver.notifyAfterCount || 3);
                        setNotifyConsecutiveCount(profile.caregiver.notifyConsecutiveCount || 2);
                        setSummaryFrequency(profile.caregiver.summaryFrequency || 'weekly-monday');
                        setShowChangeForm(true);
                      }}
                    >
                      Change Caregiver
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Name</label>
                    <input className="w-full p-2 border border-border rounded bg-background text-foreground" value={cgName} onChange={(e) => setCgName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Email</label>
                    <input className="w-full p-2 border border-border rounded bg-background text-foreground" value={cgEmail} onChange={(e) => setCgEmail(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Notify after N negatives</label>
                      <input type="number" min={1} className="w-full p-2 border border-border rounded bg-background text-foreground" value={notifyAfterCount} onChange={(e) => setNotifyAfterCount(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Notify after M consecutive negatives (same day)</label>
                      <input type="number" min={1} className="w-full p-2 border border-border rounded bg-background text-foreground" value={notifyConsecutiveCount} onChange={(e) => setNotifyConsecutiveCount(Number(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Summary Frequency</label>
                    <select className="w-full p-2 border border-border rounded bg-background text-foreground" value={summaryFrequency} onChange={(e) => setSummaryFrequency(e.target.value)}>
                      <option value="weekly-monday">Every Monday</option>
                      <option value="every-3-days">Every 3 days</option>
                      <option value="every-5-days">Every 5 days</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!user) return;
                        if (!cgName || !cgEmail) { alert('Please provide caregiver name and email'); return; }
                        setIsRequestingCaregiver(true);
                        try {
                          await requestCaregiverVerification(user.uid, {
                            name: cgName,
                            email: cgEmail,
                            notifyAfterCount,
                            notifyConsecutiveCount,
                            summaryFrequency
                          });
                          alert('Verification email sent to caregiver. The caregiver must click the link to complete verification. The existing caregiver (if any) will remain until the new caregiver verifies.');
                          setShowChangeForm(false);
                          setCgName(''); setCgEmail('');
                        } catch (err) {
                          console.error('Failed to request caregiver verification:', err);
                          alert('Failed to request caregiver verification: ' + (err as any)?.message || err);
                        } finally {
                          setIsRequestingCaregiver(false);
                        }
                      }}
                      disabled={isRequestingCaregiver}
                    >
                      {isRequestingCaregiver ? 'Requesting…' : 'Request Verification'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setCgName(''); setCgEmail(''); setNotifyAfterCount(3); setNotifyConsecutiveCount(2); setSummaryFrequency('weekly-monday'); setShowChangeForm(false); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monitoring Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="w-5 h-5" />
                Monitoring Status
              </CardTitle>
              <CardDescription className="text-base">
                Current system and device information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Monitoring</p>
                    <p className="font-medium text-foreground capitalize">
                      {profile.monitoringStatus}
                    </p>
                  </div>
                </div>
                <div 
                  className={`w-3 h-3 rounded-full ${
                    profile.monitoringStatus === 'active' 
                      ? 'bg-green-500' 
                      : 'bg-gray-400'
                  }`}
                />
              </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Device Status</p>
                    <p className="font-medium text-foreground capitalize">
                      {profile.deviceStatus}
                    </p>
                  </div>
                </div>
                <div 
                  className={`w-3 h-3 rounded-full ${
                    profile.deviceStatus === 'online' 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`}
                />
              </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="font-medium text-foreground">
                      {formatDateSafe(profile.lastActivity)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl">System Information</CardTitle>
            <CardDescription className="text-base">
              Details about the monitoring system setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Storage</p>
                <p className="text-base font-medium text-foreground">Firestore (Real-time)</p>
                <p className="text-base font-medium text-foreground">BigQuery (Historical)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">AI Model</p>
                <p className="text-base font-medium text-foreground">Facial Recognition</p>
                <p className="text-base font-medium text-foreground">Emotion Classification</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Update Frequency</p>
                <p className="text-base font-medium text-foreground">Real-time updates</p>
                <p className="text-base font-medium text-foreground">15-minute intervals</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-base text-blue-900">
                <strong>Privacy & Security:</strong> All data is encrypted and stored securely. 
                Facial recognition and mood analysis are performed with strict privacy protocols. 
                Only authorized caregivers have access to this dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
