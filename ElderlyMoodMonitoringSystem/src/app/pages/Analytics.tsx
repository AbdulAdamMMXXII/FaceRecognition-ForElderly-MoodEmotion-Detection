import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, PieChartIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeMoodReadings, subscribeMoodTrend } from '../services/firestore';
import { getMoodColor } from '../utils/moodUtils';
import type { EmotionType, MoodReading, MoodTrend } from '../types';

export function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('30d');
  const [moodTrendsData, setMoodTrendsData] = useState<MoodTrend[]>([]);
  const [moodReadingsData, setMoodReadingsData] = useState<MoodReading[]>([]);

  // subscribe to mood trend collection
  useEffect(() => {
    if (!user) return;
    const unsubTrend = subscribeMoodTrend(user.uid, (data) => {
      setMoodTrendsData(data);
    });
    const unsubReadings = subscribeMoodReadings(user.uid, (data) => {
      setMoodReadingsData(data);
    });
    return () => {
      unsubTrend();
      unsubReadings();
    };
  }, [user]);

  const getRangeStartDate = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return start;
  };

  const rangeStart = getRangeStartDate();
  const filteredTrendData = moodTrendsData.filter((day) => {
    const dayDate = new Date(`${day.date}T00:00:00`);
    return !Number.isNaN(dayDate.getTime()) && dayDate >= rangeStart;
  });

  const filteredMoodReadings = moodReadingsData.filter((reading) => {
    const timestamp = reading.timestamp instanceof Date ? reading.timestamp : new Date(reading.timestamp as unknown as string);
    return !Number.isNaN(timestamp.getTime()) && timestamp >= rangeStart;
  });

  const emotionCounts = filteredMoodReadings.reduce<Record<EmotionType, number>>(
    (counts, reading) => {
      counts[reading.emotion] += 1;
      return counts;
    },
    {
      happy: 0,
      sad: 0,
      neutral: 0,
      stressed: 0,
      anxious: 0,
      confused: 0,
    }
  );

  const totalReadings = filteredMoodReadings.length;
  const toPercent = (count: number) => (totalReadings > 0 ? Math.round((count / totalReadings) * 100) : 0);

  // Calculate emotion distribution
  const emotionDistribution = [
    { name: 'Happy', value: toPercent(emotionCounts.happy), count: emotionCounts.happy, color: getMoodColor('happy') },
    { name: 'Sad', value: toPercent(emotionCounts.sad), count: emotionCounts.sad, color: getMoodColor('sad') },
    { name: 'Neutral', value: toPercent(emotionCounts.neutral), count: emotionCounts.neutral, color: getMoodColor('neutral') },
    { name: 'Stressed', value: toPercent(emotionCounts.stressed), count: emotionCounts.stressed, color: getMoodColor('stressed') },
    { name: 'Anxious', value: toPercent(emotionCounts.anxious), count: emotionCounts.anxious, color: getMoodColor('anxious') },
    { name: 'Confused', value: toPercent(emotionCounts.confused), count: emotionCounts.confused, color: getMoodColor('confused') },
  ];

  const mostCommonEmotion = emotionDistribution.reduce(
    (current, item) => (item.count > current.count ? item : current),
    emotionDistribution[0]
  );
  const averageDailyHappiness =
    filteredTrendData.length > 0
      ? (filteredTrendData.reduce((sum, day) => sum + day.happy, 0) / filteredTrendData.length).toFixed(1)
      : '0.0';
  const stressEpisodes = filteredMoodReadings.filter((reading) => reading.emotion === 'stressed').length;

  // Zero-value slices share the same angle, so nudge those labels vertically to avoid overlap.
  const zeroValueIndexes = emotionDistribution.reduce<number[]>((acc, emotion, index) => {
    if (emotion.value === 0) acc.push(index);
    return acc;
  }, []);
  const zeroLabelOffsets = zeroValueIndexes.reduce<Record<number, number>>((acc, index, position) => {
    const center = (zeroValueIndexes.length - 1) / 2;
    acc[index] = (position - center) * 16;
    return acc;
  }, {});

  const renderDistributionLabel = (props: any) => {
    const { x, y, index, name, value, fill, textAnchor } = props;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    const yOffset = zeroLabelOffsets[index] ?? 0;

    return (
      <text
        x={x}
        y={y + yOffset}
        fill={fill || '#374151'}
        textAnchor={textAnchor || 'middle'}
        dominantBaseline="central"
        fontSize={14}
      >
        {`${name}: ${value}%`}
      </text>
    );
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Historical Mood Analytics</h1>
          <p className="text-gray-600 text-lg">
            Visualize emotional patterns and trends over time
          </p>
        </div>

        {/* Time Range Selector */}
        {filteredMoodReadings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No mood history found in this date range. Perform a mood detection to begin tracking.
          </div>
        )}
        <div className="mb-6 flex gap-2">
          {(['7d', '14d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-2 rounded-lg text-base font-medium transition-colors
                ${timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {range === '7d' ? 'Last 7 Days' : range === '14d' ? 'Last 14 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="trends" className="text-base gap-2">
              <TrendingUp className="w-4 h-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-base gap-2">
              <PieChartIcon className="w-4 h-4" />
              Distribution
            </TabsTrigger>
            <TabsTrigger value="comparison" className="text-base gap-2">
              <BarChart3 className="w-4 h-4" />
              Comparison
            </TabsTrigger>
          </TabsList>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Emotional Trends Over Time</CardTitle>
                <CardDescription className="text-base">
                  Daily mood patterns showing all emotional states
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={filteredTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ fontSize: '14px' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Line type="monotone" dataKey="happy" stroke={getMoodColor('happy')} strokeWidth={2} name="Happy" />
                    <Line type="monotone" dataKey="sad" stroke={getMoodColor('sad')} strokeWidth={2} name="Sad" />
                    <Line type="monotone" dataKey="neutral" stroke={getMoodColor('neutral')} strokeWidth={2} name="Neutral" />
                    <Line type="monotone" dataKey="stressed" stroke={getMoodColor('stressed')} strokeWidth={2} name="Stressed" />
                    <Line type="monotone" dataKey="anxious" stroke={getMoodColor('anxious')} strokeWidth={2} name="Anxious" />
                    <Line type="monotone" dataKey="confused" stroke={getMoodColor('confused')} strokeWidth={2} name="Confused" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Most Common Emotion</p>
                    <p className="text-2xl font-semibold text-green-900">
                      {totalReadings > 0 ? `${mostCommonEmotion.name} (${mostCommonEmotion.value}%)` : 'No data'}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Average Daily Happiness</p>
                    <p className="text-2xl font-semibold text-blue-900">{averageDailyHappiness}%</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700 mb-1">Stress Episodes</p>
                    <p className="text-2xl font-semibold text-amber-900">{stressEpisodes} Detected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Emotional Distribution</CardTitle>
                <CardDescription className="text-base">
                  Overall breakdown of emotions during the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={emotionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={renderDistributionLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {emotionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Detailed Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emotionDistribution.map((emotion) => (
                    <div key={emotion.name} className="flex items-center gap-4">
                      <div className="w-32 font-medium text-base">{emotion.name}</div>
                      <div className="flex-1">
                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="h-full flex items-center justify-end pr-2 text-white text-sm font-medium transition-all"
                            style={{ 
                              width: `${emotion.value}%`,
                              backgroundColor: emotion.color 
                            }}
                          >
                            {emotion.value}% ({emotion.count})
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Daily Emotion Comparison</CardTitle>
                <CardDescription className="text-base">
                  Side-by-side comparison of all emotional states
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={filteredTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ fontSize: '14px' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar dataKey="happy" fill={getMoodColor('happy')} name="Happy" />
                    <Bar dataKey="sad" fill={getMoodColor('sad')} name="Sad" />
                    <Bar dataKey="neutral" fill={getMoodColor('neutral')} name="Neutral" />
                    <Bar dataKey="stressed" fill={getMoodColor('stressed')} name="Stressed" />
                    <Bar dataKey="anxious" fill={getMoodColor('anxious')} name="Anxious" />
                    <Bar dataKey="confused" fill={getMoodColor('confused')} name="Confused" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
