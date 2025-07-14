import React, { useEffect, useState } from 'react';
import { database } from '../../firebase/config';
import { ref, onValue, off } from 'firebase/database';
import { Users, Store, TrendingUp, MessageCircle } from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  totalOutlets: number;
  totalCheckIns: number;
  totalMessages: number;
}

const DashboardMain: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalOutlets: 0,
    totalCheckIns: 0,
    totalMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const customersRef = ref(database, 'customers');
    const outletsRef = ref(database, 'outlets');
    const checkInsRef = ref(database, 'checkIns');
    const messagesRef = ref(database, 'messages');

    const fetchStats = async () => {
      try {
        // Listen for customers
        onValue(customersRef, (snapshot) => {
          const data = snapshot.val();
          const customerCount = data ? Object.keys(data).length : 0;
          setStats(prev => ({ ...prev, totalCustomers: customerCount }));
        });

        // Listen for outlets
        onValue(outletsRef, (snapshot) => {
          const data = snapshot.val();
          const outletCount = data ? Object.keys(data).length : 0;
          setStats(prev => ({ ...prev, totalOutlets: outletCount }));
        });

        // Listen for check-ins
        onValue(checkInsRef, (snapshot) => {
          const data = snapshot.val();
          const checkInCount = data ? Object.keys(data).length : 0;
          setStats(prev => ({ ...prev, totalCheckIns: checkInCount }));
        });

        // Listen for messages
        onValue(messagesRef, (snapshot) => {
          const data = snapshot.val();
          const messageCount = data ? Object.keys(data).length : 0;
          setStats(prev => ({ ...prev, totalMessages: messageCount }));
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);
      }
    };

    fetchStats();

    // Cleanup listeners on unmount
    return () => {
      off(customersRef);
      off(outletsRef);
      off(checkInsRef);
      off(messagesRef);
    };
  }, []);

  const statsCards = [
    {
      name: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Total Outlets',
      value: stats.totalOutlets,
      icon: Store,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Total Check-ins',
      value: stats.totalCheckIns,
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Total Messages',
      value: stats.totalMessages,
      icon: MessageCircle,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome to your Rewin loyalty program dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card) => (
          <div key={card.name} className={`${card.bgColor} rounded-lg p-6`}>
            <div className="flex items-center">
              <div className={`${card.color} rounded-md p-3`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <p className="text-gray-600">View recent customer check-ins and point transactions</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            View Details
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Send Messages</h3>
          <p className="text-gray-600">Send promotional messages to your customers</p>
          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            Send Message
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Reports</h3>
          <p className="text-gray-600">Download customer and sales reports</p>
          <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMain; 