import { AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import type { AlertSeverity, AlertStatus, Alert } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeAlerts } from '../services/firestore';

export function Alerts() {
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [alertsData, setAlertsData] = useState<Alert[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAlerts(user.uid, (data) => {
      setAlertsData(data);
    });
    return unsub;
  }, [user]);

  const filteredAlerts = alertsData.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    return true;
  });

  const getSeverityColor = (severity: AlertSeverity): 'destructive' | 'default' | 'secondary' => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getStatusColor = (status: AlertStatus): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'sent': return 'default';
      case 'acknowledged': return 'secondary';
      case 'resolved': return 'outline';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    const className = severity === 'high' ? 'text-red-600' : 
                     severity === 'medium' ? 'text-amber-600' : 
                     'text-blue-600';
    return <AlertTriangle className={`w-5 h-5 ${className}`} />;
  };

  // Count alerts by status
  const alertCounts = {
    total: alertsData.length,
    sent: alertsData.filter(a => a.status === 'sent').length,
    acknowledged: alertsData.filter(a => a.status === 'acknowledged').length,
    resolved: alertsData.filter(a => a.status === 'resolved').length,
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Alert Centre</h1>
          <p className="text-gray-600 text-lg">
            Monitor and manage system-generated alerts
          </p>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Total Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alertCounts.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{alertCounts.sent}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Acknowledged</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{alertCounts.acknowledged}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{alertCounts.resolved}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <div className="flex gap-2">
                  {(['all', 'high', 'medium', 'low'] as const).map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setFilterSeverity(severity)}
                      className={`
                        px-4 py-2 rounded-lg text-base font-medium transition-colors capitalize
                        ${filterSeverity === severity 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  {(['all', 'sent', 'acknowledged', 'resolved'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`
                        px-4 py-2 rounded-lg text-base font-medium transition-colors capitalize
                        ${filterStatus === status 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Alert History</CardTitle>
            <CardDescription className="text-base">
              Showing {filteredAlerts.length} of {alertsData.length} alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-500">No alerts match the selected filters</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="mt-1">
                        {getSeverityIcon(alert.severity)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {alert.title}
                          </h3>
                          <div className="flex gap-2 flex-shrink-0">
                            <Badge variant={getSeverityColor(alert.severity)} className="text-sm px-2 py-1 capitalize">
                              {alert.severity}
                            </Badge>
                            <Badge variant={getStatusColor(alert.status)} className="text-sm px-2 py-1 capitalize">
                              {alert.status}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-base text-gray-700 mb-3">
                          {alert.description}
                        </p>

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{format(alert.timestamp, 'PPpp')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
