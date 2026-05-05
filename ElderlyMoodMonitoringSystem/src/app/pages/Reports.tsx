import { FileText, Download, Calendar, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, subscribeMoodReadings, subscribeReports } from '../services/firestore';
import type { MoodReading, Report } from '../types';
import {
  downloadAllReportsPdf,
  downloadCustomComprehensiveReportPdf,
  downloadSingleReportPdf,
  type PdfUserDetails,
} from '../utils/reportPdf';

export function Reports() {
  const { user } = useAuth();
  const [reportsData, setReportsData] = useState<Report[]>([]);
  const [moodReadingsData, setMoodReadingsData] = useState<MoodReading[]>([]);
  const [pdfUserDetails, setPdfUserDetails] = useState<PdfUserDetails | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getUserProfile(user.uid)
      .then((profile) => {
        if (!active) return;
        setPdfUserDetails({
          name: profile?.name || user.displayName || 'User',
          accountId: profile?.id || user.uid,
          email: profile?.email || user.email || 'N/A',
          downloadedAt: new Date(),
        });
      })
      .catch(() => {
        if (!active) return;
        setPdfUserDetails({
          name: user.displayName || 'User',
          accountId: user.uid,
          email: user.email || 'N/A',
          downloadedAt: new Date(),
        });
      });

    const unsubReports = subscribeReports(user.uid, (r) => setReportsData(r));
    const unsubMoods = subscribeMoodReadings(user.uid, (moods) => setMoodReadingsData(moods));
    return () => {
      active = false;
      unsubReports();
      unsubMoods();
    };
  }, [user]);

  const handleDownload = (reportId: string) => {
    const selected = safeReports.find((report) => report.id === reportId);
    if (!selected) {
      alert('Unable to find this report. Please refresh and try again.');
      return;
    }
    downloadSingleReportPdf(selected, pdfUserDetails || undefined);
  };

  const handleDownloadAllReports = () => {
    if (safeReports.length === 0) {
      alert('No reports available to download.');
      return;
    }
    downloadAllReportsPdf(safeReports, pdfUserDetails || undefined);
  };

  const handleRequestCustomReport = () => {
    if (safeReports.length === 0 && moodReadingsData.length === 0) {
      alert('No saved report or mood data is available for a custom report yet.');
      return;
    }

    downloadCustomComprehensiveReportPdf({
      reports: safeReports,
      moods: moodReadingsData,
      userDetails: pdfUserDetails || undefined,
    });
  };

  // Ensure values rendered in JSX are primitive strings/numbers to avoid React errors
  const safeReports = reportsData.map((r) => {
    const toDate = (v: any) => {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v === 'object' && typeof v.toDate === 'function') {
        try {
          return v.toDate();
        } catch (_) {
          return null;
        }
      }
      const d = new Date(v as any);
      return isNaN(d.getTime()) ? null : d;
    };

    return {
      ...r,
      title: String(r.title ?? ''),
      summary: String(r.summary ?? ''),
      analysisNarrative: r.analysisNarrative ? String(r.analysisNarrative) : '',
      caregiverSummary: r.caregiverSummary ? String(r.caregiverSummary) : '',
      period: String(r.period ?? ''),
      insights: Array.isArray(r.insights) ? r.insights.map((s) => String(s)) : [],
      source: r.source ? String(r.source) : 'unknown',
      modelUsed: r.modelUsed ? String(r.modelUsed) : '',
      llmStatus: r.llmStatus || '',
      llmErrorCode: r.llmErrorCode || '',
      generatedAt: toDate((r as any).generatedAt) as Date | null,
    } as Report & { generatedAt: Date | null };
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Caregiver Reports</h1>
          <p className="text-gray-600 text-lg">
            AI-generated summaries and insights from mood monitoring data
          </p>
        </div>

        {/* Reports Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{safeReports.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Latest Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-gray-900">
                {safeReports.length > 0 && safeReports[0].generatedAt ? format(safeReports[0].generatedAt, 'MMM d, yyyy') : '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Report Type</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-gray-900">AI-Generated</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        {safeReports.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No reports available yet.
          </div>
        )}
        <div className="space-y-6">
          {safeReports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <CardTitle className="text-2xl">{report.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{report.period}</span>
                      </div>
                      <span>•</span>
                      <span>Generated {report.generatedAt ? format(report.generatedAt, 'PPp') : '—'}</span>
                      <span>•</span>
                      <span>Source: {report.source || 'unknown'}</span>
                      {report.modelUsed && (
                        <>
                          <span>•</span>
                          <span>Model: {report.modelUsed}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleDownload(report.id)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                {/* Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h3>
                  <p className="text-base text-gray-700 leading-relaxed">
                    {report.summary}
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Caregiver Context</h3>
                  <p className="text-base text-gray-700 leading-relaxed">
                    {report.caregiverSummary || report.summary || 'Caregiver context is not available for this record.'}
                  </p>
                </div>

                {/* Key Insights */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Key Insights
                  </h3>
                  <div className="space-y-3">
                    {report.insights.map((insight, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-base text-gray-800 leading-relaxed pt-1">
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LLM Context Note */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>AI-Powered Analysis:</strong>{' '}
                    {report.analysisNarrative || report.summary}
                  </p>
                  {report.llmStatus === 'error' && (
                    <p className="text-xs text-blue-800 mt-2">
                      LLM status: unavailable{report.llmErrorCode ? ` (${report.llmErrorCode})` : ''}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Generation Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">About These Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-base text-gray-700">
              <p>
                <strong>Automated Generation:</strong> Reports are automatically generated weekly and monthly 
                by our AI system, combining data from Firestore (real-time) and BigQuery (historical analysis).
              </p>
              <p>
                <strong>LLM-Powered Insights:</strong> Large Language Models analyze emotional patterns, 
                detect anomalies, and provide contextual explanations in natural language.
              </p>
              <p>
                <strong>Export Options:</strong> All reports can be downloaded as PDF files or shared via email 
                with family members and healthcare professionals.
              </p>
              <div className="mt-6 flex gap-4">
                <Button variant="outline" className="gap-2" onClick={handleRequestCustomReport}>
                  <FileText className="w-4 h-4" />
                  Request Custom Report
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleDownloadAllReports}>
                  <Download className="w-4 h-4" />
                  Download All Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
