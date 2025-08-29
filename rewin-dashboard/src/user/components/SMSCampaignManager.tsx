import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Zap,
  Eye,
  BarChart3
} from 'lucide-react';

interface TwilioStatus {
  isConnected: boolean;
  phoneNumber?: string;
  accountName?: string;
  usage?: {
    currentMonth: number;
    monthlyLimit: number;
    currentCost: number;
    costLimit: number;
    remainingMessages: number;
    remainingBudget: number;
  };
  message?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];
  status: 'draft' | 'sending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  stats?: {
    total: number;
    successful: number;
    failed: number;
    totalCost: number;
  };
}

interface UsageData {
  period: { month: number; year: number };
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  totalCost: number;
  averageCostPerMessage: number;
  campaignBreakdown: Record<string, { messages: number; cost: number }>;
}

const SMSCampaignManager: React.FC = () => {
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create' | 'usage'>('campaigns');

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    message: '',
    recipients: '',
    targetAudience: 'all' as 'all' | 'custom'
  });

  // Mock user ID - in a real app, this would come from authentication context
  const userId = 'demo-user-123';

  useEffect(() => {
    loadTwilioStatus();
    loadUsageData();
  }, []);

  const loadTwilioStatus = async () => {
    try {
      const response = await fetch('/api/twilio/customer/twilio/status', {
        headers: {
          'x-user-id': userId // Temporary for testing
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTwilioStatus(data);
      }
    } catch (error) {
      console.error('Error loading Twilio status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageData = async () => {
    try {
      const response = await fetch('/api/twilio/customer/sms/usage', {
        headers: {
          'x-user-id': userId
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsageData(data.usage);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const checkUsageLimits = async () => {
    try {
      const response = await fetch('/api/twilio/customer/sms/limits', {
        headers: {
          'x-user-id': userId
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return { withinLimits: false, reason: 'Error checking limits' };
    }
  };

  const sendCampaign = async (campaign: Partial<Campaign>) => {
    if (!twilioStatus?.isConnected) {
      alert('Twilio account not connected. Please contact admin.');
      return;
    }

    // Check usage limits first
    const limitsCheck = await checkUsageLimits();
    if (!limitsCheck.withinLimits) {
      alert(`Cannot send campaign: ${limitsCheck.reason}`);
      return;
    }

    const campaignId = Date.now().toString();
    setSendingCampaign(campaignId);

    try {
      const recipients = campaign.recipients || [];
      
      const response = await fetch('/api/twilio/customer/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          message: campaign.message,
          recipients: recipients,
          campaignId: campaignId,
          campaignName: campaign.name
        })
      });

      const result = await response.json();

      if (result.success) {
        // Add campaign to local state
        const newCampaign: Campaign = {
          id: campaignId,
          name: campaign.name || 'Unnamed Campaign',
          message: campaign.message || '',
          recipients: recipients,
          status: 'sent',
          createdAt: new Date(),
          sentAt: new Date(),
          stats: result.summary
        };

        setCampaigns(prev => [newCampaign, ...prev]);
        setShowCreateForm(false);
        setCampaignForm({ name: '', message: '', recipients: '', targetAudience: 'all' });
        
        // Refresh usage data
        await loadUsageData();
        await loadTwilioStatus();

        alert(`Campaign sent successfully! ${result.summary.successful}/${result.summary.total} messages delivered. Cost: $${result.summary.totalCost.toFixed(4)}`);
      } else {
        alert(`Failed to send campaign: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign. Please try again.');
    } finally {
      setSendingCampaign(null);
    }
  };

  const handleCreateCampaign = () => {
    const { name, message, recipients } = campaignForm;
    
    if (!name.trim() || !message.trim() || !recipients.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Parse recipients (comma-separated phone numbers)
    const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);
    
    // Validate phone numbers
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    for (const recipient of recipientList) {
      if (!phoneRegex.test(recipient)) {
        alert(`Invalid phone number: ${recipient}. Please use international format (+1234567890)`);
        return;
      }
    }

    sendCampaign({
      name,
      message,
      recipients: recipientList
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min(100, (used / limit) * 100);
  };

  const renderTwilioStatus = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">SMS Service Status</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${twilioStatus?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium ${twilioStatus?.isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {twilioStatus?.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {twilioStatus?.isConnected ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Name</label>
              <p className="text-gray-900">{twilioStatus.accountName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <p className="text-gray-900">{twilioStatus.phoneNumber}</p>
            </div>
          </div>

          {twilioStatus.usage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-700">Messages This Month</span>
                  <span className="text-sm text-blue-600">
                    {twilioStatus.usage.currentMonth} / {twilioStatus.usage.monthlyLimit}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(twilioStatus.usage.currentMonth, twilioStatus.usage.monthlyLimit)}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-blue-900 mt-2">{twilioStatus.usage.remainingMessages}</p>
                <p className="text-sm text-blue-600">remaining</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-green-700">Budget This Month</span>
                  <span className="text-sm text-green-600">
                    {formatCurrency(twilioStatus.usage.currentCost)} / {formatCurrency(twilioStatus.usage.costLimit)}
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(twilioStatus.usage.currentCost, twilioStatus.usage.costLimit)}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-green-900 mt-2">{formatCurrency(twilioStatus.usage.remainingBudget)}</p>
                <p className="text-sm text-green-600">remaining</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">SMS Service Not Available</h4>
              <p className="mt-1 text-sm text-yellow-700">
                {twilioStatus?.message || 'Your SMS service is not set up. Please contact admin to configure Twilio.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCampaignsTab = () => (
    <div className="space-y-6">
      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
          <button
            onClick={() => setActiveTab('create')}
            disabled={!twilioStatus?.isConnected}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              twilioStatus?.isConnected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
            New Campaign
          </button>
        </div>

        {campaigns.length > 0 ? (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                    campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{campaign.message}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Recipients:</span>
                    <span className="ml-1 font-medium">{campaign.recipients.length}</span>
                  </div>
                  {campaign.stats && (
                    <>
                      <div>
                        <span className="text-gray-500">Delivered:</span>
                        <span className="ml-1 font-medium text-green-600">{campaign.stats.successful}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Failed:</span>
                        <span className="ml-1 font-medium text-red-600">{campaign.stats.failed}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cost:</span>
                        <span className="ml-1 font-medium">{formatCurrency(campaign.stats.totalCost)}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Created: {campaign.createdAt.toLocaleString()}
                  {campaign.sentAt && ` • Sent: ${campaign.sentAt.toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No campaigns created yet</p>
            <button
              onClick={() => setActiveTab('create')}
              disabled={!twilioStatus?.isConnected}
              className={`mt-2 px-4 py-2 rounded-md transition-colors ${
                twilioStatus?.isConnected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Create Your First Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Create SMS Campaign</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Name *
          </label>
          <input
            type="text"
            value={campaignForm.name}
            onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Summer Sale Promotion"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            value={campaignForm.message}
            onChange={(e) => setCampaignForm(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Your promotional message here..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Character count: {campaignForm.message.length}/160 (recommended SMS length)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipients *
          </label>
          <textarea
            value={campaignForm.recipients}
            onChange={(e) => setCampaignForm(prev => ({ ...prev, recipients: e.target.value }))}
            placeholder="+1234567890, +1987654321, +1555123456"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter phone numbers separated by commas. Use international format (+1234567890)
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setActiveTab('campaigns')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateCampaign}
            disabled={sendingCampaign !== null || !campaignForm.name || !campaignForm.message || !campaignForm.recipients}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
          >
            {sendingCampaign ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsageTab = () => (
    <div className="space-y-6">
      {usageData ? (
        <>
          {/* Usage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{usageData.totalMessages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-gray-900">{usageData.successfulMessages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(usageData.totalCost)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Cost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(usageData.averageCostPerMessage)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Breakdown */}
          {Object.keys(usageData.campaignBreakdown).length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(usageData.campaignBreakdown).map(([campaignId, stats]) => (
                      <tr key={campaignId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaignId === 'direct' ? 'Direct Messages' : campaignId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.messages}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(stats.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No usage data available</p>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading SMS service...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">SMS Campaign Manager</h2>
        <p className="text-gray-600">Create and manage your SMS marketing campaigns</p>
      </div>

      {/* Twilio Status */}
      {renderTwilioStatus()}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: MessageSquare },
            { id: 'create', label: 'Create Campaign', icon: Send },
            { id: 'usage', label: 'Usage & Analytics', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'campaigns' && renderCampaignsTab()}
        {activeTab === 'create' && renderCreateTab()}
        {activeTab === 'usage' && renderUsageTab()}
      </div>
    </div>
  );
};

export default SMSCampaignManager;