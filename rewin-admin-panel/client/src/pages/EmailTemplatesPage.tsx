import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Eye, 
  Send,
  Upload,
  Image,
  X
} from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlContent: string;
  variables: string[];
  description: string;
  isActive: boolean;
  logoUrl?: string;
  createdAt: any;
  updatedAt: any;
}

interface EmailSender {
  id: string;
  name: string;
  email: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
}

const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'invitation',
    subject: '',
    htmlContent: '',
    variables: [] as string[],
    description: '',
    isActive: true
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [keepExistingLogo, setKeepExistingLogo] = useState(true);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTemplates();
    fetchSenders();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setToast({ message: 'Failed to fetch email templates', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSenders = async () => {
    try {
      const response = await fetch('/api/email-senders');
      const data = await response.json();
      if (data.success) {
        setSenders(data.senders);
      }
    } catch (error) {
      console.error('Error fetching senders:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('htmlContent', formData.htmlContent);
      formDataToSend.append('variables', JSON.stringify(formData.variables));
      formDataToSend.append('description', formData.description);
      formDataToSend.append('isActive', formData.isActive.toString());
      
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }
      
      if (editingTemplate) {
        formDataToSend.append('keepExistingLogo', keepExistingLogo.toString());
      }

      const url = editingTemplate 
        ? `/api/email-templates/${editingTemplate.id}`
        : '/api/email-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        setToast({ 
          message: editingTemplate ? 'Template updated successfully' : 'Template created successfully', 
          type: 'success' 
        });
        fetchTemplates();
        handleCloseModal();
      } else {
        setToast({ message: data.message || 'Failed to save template', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setToast({ message: 'Failed to save template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Template deleted successfully', type: 'success' });
        fetchTemplates();
      } else {
        setToast({ message: data.message || 'Failed to delete template', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setToast({ message: 'Failed to delete template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testTemplate) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/email-templates/${testTemplate.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail,
          testData
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

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject,
      htmlContent: template.htmlContent,
      variables: template.variables || [],
      description: template.description,
      isActive: template.isActive
    });
    setLogoPreview(template.logoUrl || '');
    setKeepExistingLogo(true);
    setLogoFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: 'invitation',
      subject: '',
      htmlContent: '',
      variables: [],
      description: '',
      isActive: true
    });
    setLogoFile(null);
    setLogoPreview('');
    setKeepExistingLogo(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setKeepExistingLogo(false);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addVariable = () => {
    const variableName = prompt('Enter variable name (without {{}}):');
    if (variableName && !formData.variables.includes(variableName)) {
      setFormData({
        ...formData,
        variables: [...formData.variables, variableName]
      });
    }
  };

  const removeVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable)
    });
  };

  const getPreviewContent = (template: EmailTemplate) => {
    let content = template.htmlContent;
    
    // Replace variables with sample data
    template.variables?.forEach(variable => {
      const sampleData: Record<string, string> = {
        displayName: 'John Doe',
        email: 'john@example.com',
        resetLink: 'https://example.com/reset',
        invitationLink: 'https://example.com/invite'
      };
      
      const value = sampleData[variable] || `[${variable}]`;
      content = content.replace(new RegExp(`{{\\s*${variable}\\s*}}`, 'g'), value);
    });
    
    return content;
  };

  if (loading && templates.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Email Templates</h1>
          <p className="text-gray-300">Manage email templates for invitations, notifications, and more</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} /> New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-xl text-white mb-2">{template.name}</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  template.type === 'invitation' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  template.type === 'password-reset' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                  'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                }`}>
                  {template.type}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPreviewTemplate(template);
                    setShowPreviewModal(true);
                  }}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
                  title="Preview"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => {
                    setTestTemplate(template);
                    setTestEmail('');
                    setTestData({});
                    setShowTestModal(true);
                  }}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-green-400 hover:bg-green-500/20 transition-all duration-200"
                  title="Test Email"
                >
                  <Send size={16} />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-purple-400 hover:bg-purple-500/20 transition-all duration-200"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {template.logoUrl && (
              <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <img 
                  src={template.logoUrl} 
                  alt="Template logo" 
                  className="h-12 object-contain"
                />
              </div>
            )}

            <p className="text-gray-300 text-sm mb-4 leading-relaxed">{template.description}</p>
            <p className="text-sm font-medium mb-4 text-white">Subject: <span className="text-gray-300">{template.subject}</span></p>
            
            {template.variables && template.variables.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 text-white">Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable) => (
                    <span key={variable} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-xs border border-purple-500/30">
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                template.isActive ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 max-w-md mx-auto">
            <Mail className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No email templates</h3>
            <p className="text-gray-300 mb-6">
              Get started by creating your first email template.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg mx-auto"
            >
              <Plus size={20} /> New Template
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Edit Template' : 'Create New Template'}
      >
        <div className="bg-slate-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter template name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="invitation">Invitation</option>
                  <option value="password-reset">Password Reset</option>
                  <option value="welcome">Welcome</option>
                  <option value="notification">Notification</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter email subject"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder="Brief description of this template"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Logo
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center gap-2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors text-gray-300"
                >
                  <Upload size={16} /> Upload Logo
                </label>
                
                {logoPreview && (
                  <div className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg border border-slate-600">
                    <img src={logoPreview} alt="Logo preview" className="h-12 object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview('');
                        setLogoFile(null);
                        setKeepExistingLogo(false);
                      }}
                      className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Variables */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Variables
                </label>
                <button
                  type="button"
                  onClick={addVariable}
                  className="text-purple-400 hover:text-purple-300 text-sm px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
                >
                  + Add Variable
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.variables.map((variable) => (
                  <span
                    key={variable}
                    className="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-purple-500/30"
                  >
                    {`{{${variable}}}`}
                    <button
                      type="button"
                      onClick={() => removeVariable(variable)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                HTML Content
              </label>
              <textarea
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                rows={12}
                placeholder="Enter HTML content here. Use {{variableName}} for dynamic content."
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-3 w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
                Active Template
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-600">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-6 py-3 text-gray-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-lg"
              >
                {loading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Email Preview"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Subject:</h3>
              <p className="text-gray-600">{previewTemplate.subject}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Content:</h3>
              <div 
                className="border rounded-lg p-4 max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: getPreviewContent(previewTemplate) }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Test Email Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Send Test Email"
      >
        {testTemplate && (
          <div className="space-y-4">
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

            {testTemplate.variables && testTemplate.variables.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Test Data for Variables:</h3>
                {testTemplate.variables.map((variable) => (
                  <div key={variable} className="mb-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      {`{{${variable}}}`}
                    </label>
                    <input
                      type="text"
                      value={testData[variable] || ''}
                      onChange={(e) => setTestData({
                        ...testData,
                        [variable]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter value for ${variable}`}
                    />
                  </div>
                ))}
              </div>
            )}

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

export default EmailTemplatesPage;
