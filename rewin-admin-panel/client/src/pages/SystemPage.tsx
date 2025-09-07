import React, { useState, useEffect } from 'react';
import { Settings, Server, Database, Shield, Activity, AlertTriangle, CheckCircle, Clock, Cpu, HardDrive } from 'lucide-react';

interface SystemStatus {
  database: 'online' | 'offline';
  api: 'online' | 'offline';
  auth: 'online' | 'offline';
  storage: 'online' | 'offline';
  lastCheck: string;
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

const SystemPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'online',
    api: 'online',
    auth: 'online',
    storage: 'online',
    lastCheck: new Date().toISOString(),
    uptime: '15 days, 8 hours, 32 minutes',
    cpuUsage: 23,
    memoryUsage: 67,
    diskUsage: 45
  });

  const services = [
    {
      name: 'Database',
      status: systemStatus.database,
      icon: Database,
      description: 'Firebase Firestore'
    },
    {
      name: 'API Server',
      status: systemStatus.api,
      icon: Server,
      description: 'Express.js Backend'
    },
    {
      name: 'Authentication',
      status: systemStatus.auth,
      icon: Shield,
      description: 'Firebase Auth'
    },
    {
      name: 'Storage',
      status: systemStatus.storage,
      icon: HardDrive,
      description: 'Firebase Storage'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">System Management</h1>
        <p className="page-subtitle">
          Monitor system health, performance metrics, and manage system operations.
        </p>
      </div>

      {/* System Status Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">System Uptime</p>
              <p className="text-xs text-gray-500 mt-1">Current uptime</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-green-500 to-green-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">{systemStatus.uptime}</div>
          <div className="stat-change positive">
            <CheckCircle size={14} />
            All systems operational
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">CPU Usage</p>
              <p className="text-xs text-gray-500 mt-1">Current load</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-blue-500 to-blue-600">
              <Cpu size={20} />
            </div>
          </div>
          <div className="stat-value">{systemStatus.cpuUsage}%</div>
          <div className="stat-change positive">
            <CheckCircle size={14} />
            Normal load
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">Memory Usage</p>
              <p className="text-xs text-gray-500 mt-1">RAM utilization</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-orange-500 to-orange-600">
              <Activity size={20} />
            </div>
          </div>
          <div className="stat-value">{systemStatus.memoryUsage}%</div>
          <div className="stat-change positive">
            <CheckCircle size={14} />
            Acceptable usage
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">Disk Usage</p>
              <p className="text-xs text-gray-500 mt-1">Storage utilization</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-purple-500 to-purple-600">
              <HardDrive size={20} />
            </div>
          </div>
          <div className="stat-value">{systemStatus.diskUsage}%</div>
          <div className="stat-change positive">
            <CheckCircle size={14} />
            Good capacity
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Service Status</h3>
            <p className="card-subtitle">Real-time service monitoring</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <Icon size={20} className="text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.description}</p>
                      </div>
                    </div>
                    <span className={`badge ${
                      service.status === 'online' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {service.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent System Logs</h3>
            <p className="card-subtitle">Latest system events</p>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle size={16} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">System check completed</p>
                  <p className="text-xs text-green-700">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Activity size={16} className="text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">API request processed</p>
                  <p className="text-xs text-blue-700">5 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle size={16} className="text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">High memory usage detected</p>
                  <p className="text-xs text-yellow-700">10 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle size={16} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Database backup completed</p>
                  <p className="text-xs text-green-700">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Actions</h3>
          <p className="card-subtitle">Administrative operations</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn btn-secondary">
              <Database size={16} />
              Backup Database
            </button>
            <button className="btn btn-secondary">
              <Activity size={16} />
              Clear Cache
            </button>
            <button className="btn btn-secondary">
              <Settings size={16} />
              System Settings
            </button>
            <button className="btn btn-danger">
              <AlertTriangle size={16} />
              Emergency Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPage; 