import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Send,
  Check,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface EmailSender {
  id: string;
  name: string;
  email: string;
  displayName: string;
  service?: string;
  host?: string;
  port?: number;
  secure: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: any;
  updatedAt: any;
}

const EmailSendersPage: React.FC = () => {
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingSender, setEditingSender] = useState<EmailSender | null>(null);
  const [testSender, setTestSender] = useState<EmailSender | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    displayName: '',
    service: 'gmail',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    isActive: true,
    isDefault: false
  });

  // Test email state
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      const response = await fetch('/api/email-senders');
      const data = await response.json();
      if (data.success) {
        setSenders(data.senders);
      }
    } catch (error) {
      console.error('Error fetching senders:', error);
      setToast({ message: 'Failed to fetch email senders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingSender 
        ? `/api/email-senders/${editingSender.id}`
        : '/api/email-senders';
      
      const method = editingSender ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setToast({ 
          message: editingSender ? 'Sender updated successfully' : 'Sender created successfully', 
          type: 'success' 
        });
        fetchSenders();
        handleCloseModal();
      } else {
        setToast({ message: data.message || 'Failed to save sender', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving sender:', error);
      setToast({ message: 'Failed to save sender', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (senderId: string) => {
    if (!window.confirm('Are you sure you want to delete this sender configuration?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/email-senders/${senderId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Sender deleted successfully', type: 'success' });
        fetchSenders();
      } else {
        setToast({ message: data.message || 'Failed to delete sender', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting sender:', error);
      setToast({ message: 'Failed to delete sender', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testSender) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/email-senders/${testSender.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Test email sent successfully', type: 'success' });
        setShowTestModal(false);
      } else {
        setToast({ message: data.message || 'Failed to send test email', type: 'error' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setToast({ message: 'Failed to send test email', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sender: EmailSender) => {
    setEditingSender(sender);
    setFormData({
      name: sender.name,
      email: sender.email,
      displayName: sender.displayName,
      service: sender.service || '',
      host: sender.host || '',
      port: sender.port || 587,
      secure: sender.secure,
      username: '', // Don't pre-fill sensitive data
      password: '', // Don't pre-fill sensitive data
      isActive: sender.isActive,
      isDefault: sender.isDefault
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSender(null);
    setFormData({
      name: '',
      email: '',
      displayName: '',
      service: 'gmail',
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      isActive: true,
      isDefault: false
    });
    setShowPassword(false);
  };

  if (loading && senders.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Email Senders</h1>
          <p className="text-gray-300">Manage email sender configurations and SMTP settings</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} /> New Sender
        </button>
      </div>

      {/* Senders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {senders.map((sender) => (
          <div key={sender.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-xl text-white mb-2">{sender.name}</h3>
                <p className="text-gray-300 text-sm mb-1">{sender.email}</p>
                <p className="text-gray-400 text-sm">Display: {sender.displayName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTestSender(sender);
                    setTestEmail('');
                    setShowTestModal(true);
                  }}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-green-400 hover:bg-green-500/20 transition-all duration-200"
                  title="Test Email"
                >
                  <Send size={16} />
                </button>
                <button
                  onClick={() => handleEdit(sender)}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-purple-400 hover:bg-purple-500/20 transition-all duration-200"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(sender.id)}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Configuration:</span>
                <span className="font-medium text-white">
                  {sender.service ? sender.service.toUpperCase() : `${sender.host}:${sender.port}`}
                </span>
              </div>
              
              {sender.secure && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Security:</span>
                  <span className="text-green-400 font-medium">SSL/TLS</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  sender.isActive ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {sender.isActive ? 'Active' : 'Inactive'}
                </span>
                
                {sender.isDefault && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Default
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {senders.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 max-w-md mx-auto">
            <Mail className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No email senders</h3>
            <p className="text-gray-300 mb-6">
              Get started by creating your first email sender configuration.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg mx-auto"
            >
              <Plus size={20} /> New Sender
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Sender Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingSender ? 'Edit Email Sender' : 'Create New Email Sender'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Main Email Server"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="noreply@yourcompany.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Company Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Configuration Type
            </label>
            <select
              value={formData.service ? 'service' : 'smtp'}
              onChange={(e) => {
                if (e.target.value === 'service') {
                  setFormData({ ...formData, service: 'gmail', host: '', port: 587 });
                } else {
                  setFormData({ ...formData, service: '', host: '', port: 587 });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="service">Email Service (Gmail, Yahoo, etc.)</option>
              <option value="smtp">Custom SMTP Server</option>
            </select>
          </div>

          {formData.service ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Service
              </label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gmail">Gmail</option>
                <option value="yahoo">Yahoo</option>
                <option value="outlook">Outlook</option>
                <option value="hotmail">Hotmail</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="smtp.yourprovider.com"
                  required={!formData.service}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="65535"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Usually your email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingSender ? "Leave blank to keep current" : "App password or regular password"}
                  required={!editingSender}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="secure"
                checked={formData.secure}
                onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="secure" className="text-sm font-medium text-gray-700">
                Use SSL/TLS
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Set as Default
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Security Note
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    For Gmail and other major providers, use an App Password instead of your regular password. 
                    Enable 2-factor authentication and generate an app-specific password in your account settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingSender ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Test Email Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Send Test Email"
      >
        {testSender && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Testing Configuration:</h3>
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p><strong>Sender:</strong> {testSender.name}</p>
                <p><strong>Email:</strong> {testSender.email}</p>
                <p><strong>Display Name:</strong> {testSender.displayName}</p>
                <p><strong>Configuration:</strong> {testSender.service ? testSender.service.toUpperCase() : `${testSender.host}:${testSender.port}`}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address to send test"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTestEmail}
                disabled={loading || !testEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default EmailSendersPage;
