import { BarChart3, Package, DollarSign, Users, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    {
      label: 'Total Orders',
      value: '147',
      change: '+12%',
      icon: Package,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Revenue',
      value: '$24,580',
      change: '+18%',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Active Customers',
      value: '89',
      change: '+7%',
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Avg. Order Value',
      value: '$167',
      change: '+5%',
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  const recentOrders = [
    { id: '12345', customer: 'John Smith', material: 'Birch Plywood', status: 'cutting', amount: 145.50 },
    { id: '12344', customer: 'Sarah Johnson', material: 'Clear Acrylic', status: 'processing', amount: 223.00 },
    { id: '12343', customer: 'Mike Williams', material: 'Aluminum', status: 'shipping', amount: 389.75 },
    { id: '12342', customer: 'Emily Brown', material: 'Black Acrylic', status: 'completed', amount: 156.25 },
  ];

  const materialInventory = [
    { name: 'Birch Plywood', stock: 85, threshold: 20, status: 'good' },
    { name: 'Clear Acrylic', stock: 65, threshold: 30, status: 'good' },
    { name: 'Aluminum', stock: 15, threshold: 20, status: 'low' },
    { name: 'Black Leather', stock: 5, threshold: 15, status: 'critical' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-green-600">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">#{order.id}</div>
                  <div className="text-sm text-gray-600">{order.customer}</div>
                  <div className="text-xs text-gray-500">{order.material}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">${order.amount.toFixed(2)}</div>
                  <div className={`text-xs font-medium capitalize ${
                    order.status === 'completed' ? 'text-green-600' :
                    order.status === 'shipping' ? 'text-purple-600' :
                    order.status === 'cutting' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {order.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Material Inventory</h2>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {materialInventory.map((material) => (
              <div key={material.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{material.name}</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{material.stock} sheets</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      material.status === 'good' ? 'bg-green-100 text-green-700' :
                      material.status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {material.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      material.status === 'good' ? 'bg-green-600' :
                      material.status === 'low' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${(material.stock / 100) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
