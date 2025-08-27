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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600">Manage email templates for invitations, notifications, and more</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus /> New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  template.type === 'invitation' ? 'bg-blue-100 text-blue-800' :
                  template.type === 'password-reset' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
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
                  className="text-gray-600 hover:text-blue-600"
                  title="Preview"
                >
                  <Eye />
                </button>
                <button
                  onClick={() => {
                    setTestTemplate(template);
                    setTestEmail('');
                    setTestData({});
                    setShowTestModal(true);
                  }}
                  className="text-gray-600 hover:text-green-600"
                  title="Test Email"
                >
                  <Send />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="text-gray-600 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-gray-600 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 />
                </button>
              </div>
            </div>

            {template.logoUrl && (
              <div className="mb-4">
                <img 
                  src={template.logoUrl} 
                  alt="Template logo" 
                  className="h-12 object-contain"
                />
              </div>
            )}

            <p className="text-gray-600 text-sm mb-4">{template.description}</p>
            <p className="text-sm font-medium mb-2">Subject: {template.subject}</p>
            
            {template.variables && template.variables.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span key={variable} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                template.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Edit Template' : 'Create New Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <Upload /> Upload Logo
              </label>
              
              {logoPreview && (
                <div className="flex items-center gap-2">
                  <img src={logoPreview} alt="Logo preview" className="h-12 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('');
                      setLogoFile(null);
                      setKeepExistingLogo(false);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Variables */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Variables
              </label>
              <button
                type="button"
                onClick={addVariable}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Variable
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((variable) => (
                <span
                  key={variable}
                  className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm flex items-center gap-1"
                >
                  {`{{${variable}}}`}
                  <button
                    type="button"
                    onClick={() => removeVariable(variable)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML Content
            </label>
            <textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
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
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active
            </label>
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
              {loading ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
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
