import { Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, subscribeToUserProfile, getLatestMood, subscribeLatestMood } from '../services/firestore';
import { getMoodColor, getMoodEmoji } from '../utils/moodUtils';
import type { ElderlyProfile, MoodReading } from '../types';

export function Dashboard() {
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [mood, setMood] = useState<MoodReading | null>(null);

  const moodColor = mood ? getMoodColor(mood.emotion) : '#6b7280';
  const moodEmoji = mood ? getMoodEmoji(mood.emotion) : '😐';
  const confidencePercent = mood ? Math.round(mood.confidence * 100) : 0;

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // load profile once and subscribe for updates
    getUserProfile(user.uid)
      .then((p) => { if (p) setProfile(p); })
      .catch(() => {});
    const unsubProfile = subscribeToUserProfile(user.uid, (p) => {
      if (p) setProfile(p);
    });

    // load latest mood and subscribe
    getLatestMood(user.uid)
      .then((m) => { if (m) setMood(m); })
      .catch(() => {});
    const unsubMood = subscribeLatestMood(user.uid, (m) => setMood(m));

    return () => {
      unsubProfile && unsubProfile();
      unsubMood && unsubMood();
    };
  }, [user]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Real-Time Dashboard</h1>
          <p className="text-gray-600 text-lg">
            Monitor {profile?.name || 'the user'}'s current emotional well-being
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Monitoring Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5" />
                Monitoring Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-base text-gray-600">Status</span>
                <Badge 
                  variant={profile?.monitoringStatus === 'active' ? 'default' : 'secondary'}
                  className="text-base px-3 py-1"
                >
                  {profile?.monitoringStatus || 'inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Device Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {profile?.deviceStatus === 'online' ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                Device Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-base text-gray-600">Connection</span>
                <Badge 
                  variant={profile?.deviceStatus === 'online' ? 'default' : 'destructive'}
                  className="text-base px-3 py-1"
                >
                  {profile?.deviceStatus || 'offline'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Last Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                Last Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-gray-900">
                {profile?.lastActivity ? formatDistanceToNow(profile.lastActivity, { addSuffix: true }) : 'no data'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Mood - Large Display */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Current Emotional State</CardTitle>
            <CardDescription className="text-base">
              Latest mood detection from AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mood ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Emotion Display */}
                <div className="flex items-center gap-6">
                  <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center text-6xl"
                    style={{ backgroundColor: `${moodColor}20` }}
                  >
                    {moodEmoji}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Detected Emotion</p>
                    <h2 
                      className="text-5xl font-semibold capitalize mb-2"
                      style={{ color: moodColor }}
                    >
                      {mood.emotion}
                    </h2>
                    <p className="text-base text-gray-600">
                      {formatDistanceToNow(mood.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="flex flex-col items-center bg-gray-50 rounded-lg p-6 min-w-[200px]">
                  <p className="text-base text-gray-600 mb-2">Confidence Score</p>
                  <div className="relative w-40 h-40">
                    <svg className="transform -rotate-90 w-40 h-40">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke={moodColor}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 70}`}
                        strokeDashoffset={`${2 * Math.PI * 70 * (1 - mood.confidence)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold" style={{ color: moodColor }}>
                        {confidencePercent}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {confidencePercent >= 80 ? 'High confidence' : 
                     confidencePercent >= 60 ? 'Moderate confidence' : 
                     'Low confidence'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No mood reading available yet. Perform a detection to see results.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emotion Indicators Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Emotional Status Indicators</CardTitle>
            <CardDescription className="text-base">
              Understanding the colour-coded emotion states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { emotion: 'happy', label: 'Happy', emoji: '😊' },
                { emotion: 'sad', label: 'Sad', emoji: '😢' },
                { emotion: 'neutral', label: 'Neutral', emoji: '😐' },
                { emotion: 'stressed', label: 'Stressed', emoji: '😰' },
                { emotion: 'anxious', label: 'Anxious', emoji: '😟' },
                { emotion: 'confused', label: 'Confused', emoji: '😕' },
              ].map((item) => {
                const color = getMoodColor(item.emotion);
                return (
                  <div 
                    key={item.emotion}
                    className="flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:shadow-md"
                    style={{ borderColor: color }}
                  >
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {item.emoji}
                    </div>
                    <p 
                      className="font-medium text-base"
                      style={{ color }}
                    >
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
