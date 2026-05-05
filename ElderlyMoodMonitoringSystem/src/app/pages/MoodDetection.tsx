import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import type { EmotionType } from '../types';
import { getMoodColor, getMoodEmoji } from '../utils/moodUtils';
import { analyzeImage } from '../services/moodAnalyzer';
import { useAuth } from '../contexts/AuthContext';
import { addMoodReading, subscribeMoodReading } from '../services/firestore';

export function MoodDetection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectedMood, setDetectedMood] = useState<{
    emotion: EmotionType;
    confidence: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isWaitingForLlm, setIsWaitingForLlm] = useState(false);
  const [llmMessage, setLlmMessage] = useState<string | null>(null);
  const [llmReportSummary, setLlmReportSummary] = useState<string | null>(null);
  const [llmDetailedAnalysis, setLlmDetailedAnalysis] = useState<string | null>(null);
  const [llmSource, setLlmSource] = useState<string | null>(null);
  const [llmModel, setLlmModel] = useState<string | null>(null);
  const llmUnsubRef = useRef<null | (() => void)>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (llmUnsubRef.current) {
        llmUnsubRef.current();
        llmUnsubRef.current = null;
      }
    };
  }, []);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        console.log('Image loaded, size:', result.length);
        setSelectedImage(result);
        setDetectedMood(null);
        stopCamera();
        // Reset file input after successful load so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        alert('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      // Save stream immediately and flip UI to render the <video> element.
      // We'll attach the stream to the video element in an effect when the element exists.
      streamRef.current = stream;
      setIsCameraActive(true);
      setSelectedImage(null);
      setDetectedMood(null);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Attach stream to video element once the element is mounted and camera is active.
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true;
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch((e) => console.warn('Autoplay prevented:', e));
        }
      } catch (err) {
        console.warn('Failed to attach stream to video element:', err);
      }
    }
  }, [isCameraActive]);

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        // clear srcObject to release the video element
        (videoRef.current.srcObject as MediaStream | null) = null;
      } catch (_) {}
    }
    setIsCameraActive(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      // videoWidth/Height may be 0 until metadata loads; fall back to element size
      const vw = videoRef.current.videoWidth || videoRef.current.clientWidth || 640;
      const vh = videoRef.current.videoHeight || videoRef.current.clientHeight || 480;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setSelectedImage(imageData);
        stopCamera();
      }
    }
  };

  // real AI mood detection using face-api
  const analyzeMood = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(selectedImage);
      setDetectedMood(result);
      // do not auto-save here — let the user press "Save Result" explicitly
    } catch (err: any) {
      console.error('analysis error', err);
      if (err.message && err.message.toLowerCase().includes('permission')) {
        alert('Failed to analyze image due to permission issue: ' + err.message);
      } else {
        alert('Failed to analyze image: ' + (err.message || err));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveResult = async () => {
    if (!detectedMood || !user) return;
    setIsSaving(true);
    try {
      const moodId = await addMoodReading(user.uid, {
        id: crypto.randomUUID(),
        emotion: detectedMood.emotion,
        confidence: detectedMood.confidence,
        timestamp: new Date()
      });

      setLlmMessage(null);
      setLlmReportSummary(null);
      setLlmDetailedAnalysis(null);
      setLlmSource(null);
      setLlmModel(null);
      setIsWaitingForLlm(true);

      if (llmUnsubRef.current) {
        llmUnsubRef.current();
        llmUnsubRef.current = null;
      }

      llmUnsubRef.current = subscribeMoodReading(user.uid, moodId, (savedMood) => {
        const explanation = savedMood?.explanation;
        if (!explanation?.elderlyMessage) return;
        setLlmMessage(explanation.elderlyMessage);
        setLlmReportSummary(explanation.reportSummary || null);
        setLlmDetailedAnalysis((explanation as any).analysisNarrative || null);
        setLlmSource(explanation.source || 'unknown');
        setLlmModel(explanation.modelUsed || null);
        setIsWaitingForLlm(false);
      });

      alert('Mood saved successfully. LLM explanation and reports are being generated.');
    } catch (saveErr: any) {
      console.error('Failed to save mood data:', saveErr);
      const code = saveErr?.code ? ` (${saveErr.code})` : '';
      alert('Failed to save mood data: ' + (saveErr.message || saveErr) + code);
      setIsWaitingForLlm(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all
  const clearAll = () => {
    setSelectedImage(null);
    setDetectedMood(null);
    setIsWaitingForLlm(false);
    setLlmMessage(null);
    setLlmReportSummary(null);
    setLlmDetailedAnalysis(null);
    setLlmSource(null);
    setLlmModel(null);
    if (llmUnsubRef.current) {
      llmUnsubRef.current();
      llmUnsubRef.current = null;
    }
    stopCamera();
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">AI Mood Detection</h1>
          <p className="text-gray-600 text-lg">
            Upload an image or use your camera to detect emotional state
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Image Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Capture or Upload Image</CardTitle>
              <CardDescription className="text-base">
                Choose a method to provide an image for analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={startCamera}
                  disabled={isCameraActive}
                  className="flex-1 gap-2"
                  variant={isCameraActive ? 'secondary' : 'default'}
                >
                  <Camera className="w-5 h-5" />
                  Use Camera
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCameraActive}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Upload className="w-5 h-5" />
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Preview Area */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                      <Button onClick={capturePhoto} size="lg">
                        Capture Photo
                      </Button>
                      <Button onClick={stopCamera} size="lg" variant="secondary">
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : selectedImage ? (
                  <>
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={clearAll}
                      className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Camera className="w-16 h-16 mx-auto mb-3" />
                      <p className="text-base">No image selected</p>
                      <p className="text-sm">Use camera or upload an image</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              {selectedImage && !detectedMood && (
                <Button
                  onClick={analyzeMood}
                  disabled={isAnalyzing}
                  className="w-full gap-2 text-base h-12"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Mood'}
                </Button>
              )}

              {isAnalyzing && (
                <div className="text-center py-4">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-600">AI is analyzing the image...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Side - Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Detection Results</CardTitle>
              <CardDescription className="text-base">
                AI-powered emotional state analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detectedMood ? (
                <div className="space-y-6">
                  {/* Detected Emotion */}
                  <div className="text-center">
                    <div 
                      className="w-32 h-32 mx-auto rounded-full flex items-center justify-center text-6xl mb-4"
                      style={{ backgroundColor: `${getMoodColor(detectedMood.emotion)}20` }}
                    >
                      {getMoodEmoji(detectedMood.emotion)}
                    </div>
                    <h3 
                      className="text-4xl font-semibold capitalize mb-2"
                      style={{ color: getMoodColor(detectedMood.emotion) }}
                    >
                      {detectedMood.emotion}
                    </h3>
                    <p className="text-gray-600 text-base">Detected Emotion</p>
                  </div>

                  {/* Confidence Score */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2 text-center">Confidence Score</p>
                    <div className="flex items-center justify-center mb-2">
                      <span 
                        className="text-5xl font-bold"
                        style={{ color: getMoodColor(detectedMood.emotion) }}
                      >
                        {Math.round(detectedMood.confidence * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${detectedMood.confidence * 100}%`,
                          backgroundColor: getMoodColor(detectedMood.emotion)
                        }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-2">
                      {detectedMood.confidence >= 0.8 ? 'High confidence' : 
                       detectedMood.confidence >= 0.6 ? 'Moderate confidence' : 
                       'Low confidence'}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-800">Use "Save Result" to see the LLM Explanation and persist this reading to the profile.</p>
                  </div>

                  {(isWaitingForLlm || llmMessage) && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-semibold text-emerald-900">LLM Explanation</p>
                      {isWaitingForLlm && !llmMessage ? (
                        <p className="text-sm text-emerald-900">Generating Gemini Flash explanation from the saved mood result...</p>
                      ) : (
                        <>
                          <p className="text-sm text-emerald-900">{llmMessage}</p>
                          {llmReportSummary && (
                            <p className="text-sm text-emerald-900 mt-2">
                              <strong>Executive Summary:</strong> {llmReportSummary}
                            </p>
                          )}
                          {llmDetailedAnalysis && (
                            <p className="text-sm text-emerald-900 mt-2">
                              <strong>Detailed Analysis:</strong> {llmDetailedAnalysis}
                            </p>
                          )}
                          <p className="text-xs text-emerald-800">
                            Source: {llmSource || 'unknown'}{llmModel ? ` | Model: ${llmModel}` : ''}
                          </p>
                        </>
                      )}
                      <div className="pt-2">
                        <Button onClick={() => navigate('/reports')} variant="outline" className="w-full">
                          Read Full Report
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={clearAll} className="flex-1" variant="outline">
                      Analyze Another
                    </Button>
                    <Button onClick={saveResult} className="flex-1" disabled={!detectedMood || isSaving || !user}>
                      {isSaving ? 'Saving…' : 'Save Result'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-500 mb-2">No results yet</p>
                  <p className="text-sm text-gray-400">
                    Upload or capture an image and click "Analyze Mood" to see results
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Information Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-base">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">1. Capture Image</h4>
                <p className="text-gray-600 text-sm">
                  Take a photo using your camera or upload an existing image from your device.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">2. AI Analysis</h4>
                <p className="text-gray-600 text-sm">
                  Advanced AI algorithms analyze facial expressions to detect emotional states.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">3. View Results</h4>
                <p className="text-gray-600 text-sm">
                  Get instant results with confidence scores and save them to the monitoring history.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
