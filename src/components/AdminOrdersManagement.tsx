import { useState, useEffect } from 'react';
import { Package, Search, Filter, RefreshCw, Eye, CheckCircle, XCircle } from 'lucide-react';
import {
  getAllOrders,
  getOrderStatistics,
  type OrderDetails,
  type OrderFilters,
  type OrderSortField,
  type SortDirection,
  type OrderStatus,
} from '../services/admin-orders';

interface AdminOrdersManagementProps {
  onViewOrder: (order: OrderDetails) => void;
}

export default function AdminOrdersManagement({ onViewOrder }: AdminOrdersManagementProps) {
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Filters and sorting
  const [filters, setFilters] = useState<OrderFilters>({});
  const [sortField, setSortField] = useState<OrderSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  useEffect(() => {
    loadOrders();
    loadStatistics();
  }, [filters, sortField, sortDirection]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders(filters, sortField, sortDirection);
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await getOrderStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm || undefined });
  };

  const handleStatusFilter = (status: OrderStatus | '') => {
    setStatusFilter(status);
    setFilters({ ...filters, status: status || undefined });
  };

  const handleSort = (field: OrderSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmation_pending: 'bg-blue-100 text-blue-800',
      in_production: 'bg-purple-100 text-purple-800',
      cutting: 'bg-orange-100 text-orange-800',
      post_processing: 'bg-orange-100 text-orange-800',
      quality_check: 'bg-indigo-100 text-indigo-800',
      packaging: 'bg-cyan-100 text-cyan-800',
      shipped: 'bg-green-100 text-green-800',
      delivered: 'bg-green-200 text-green-900',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending Payment',
      confirmation_pending: 'Awaiting Confirmation',
      in_production: 'In Production',
      cutting: 'Cutting',
      post_processing: 'Post Processing',
      quality_check: 'Quality Check',
      packaging: 'Packaging',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Orders</span>
              <Package className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
          </div>

          <div className="bg-white rounded-lg border-2 border-yellow-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Awaiting Confirmation</span>
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-900">{stats.awaitingConfirmation}</div>
          </div>

          <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">In Production</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">{stats.inProduction}</div>
          </div>

          <div className="bg-white rounded-lg border-2 border-green-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Delivered</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.delivered}</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by order number or customer name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value as OrderStatus | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="confirmation_pending">Awaiting Confirmation</option>
              <option value="pending">Pending Payment</option>
              <option value="in_production">In Production</option>
              <option value="cutting">Cutting</option>
              <option value="post_processing">Post Processing</option>
              <option value="quality_check">Quality Check</option>
              <option value="packaging">Packaging</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => { loadOrders(); loadStatistics(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  onClick={() => handleSort('order_number')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Order # {sortField === 'order_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('customer_name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Customer {sortField === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('total_amount')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Total {sortField === 'total_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Loading orders...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{order.customer_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{order.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
