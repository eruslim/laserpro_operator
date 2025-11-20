import { useState, useEffect } from 'react';
import { X, Package, User, MapPin, DollarSign, FileText, Image, CheckCircle, XCircle, UserPlus, Clock, Download } from 'lucide-react';
import {
  type OrderDetails,
  approvePayment,
  rejectPayment,
  assignToOperator,
  updateOrderStatus,
  getOrderStatusHistory,
  getOperators,
  getFileUrl,
  getSignedUrlFromPath,
  type OrderStatus,
} from '../services/admin-orders';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetails | null;
  currentUserId: string;
  onOrderUpdated: () => void;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  currentUserId,
  onOrderUpdated,
}: OrderDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [designFileUrls, setDesignFileUrls] = useState<Record<string, string>>({});
  const [downloadingFiles, setDownloadingFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
  }, [isOpen, order]);

  const handleDownloadFile = async (itemId: string, fileName: string) => {
    if (!designFileUrls[itemId]) return;

    setDownloadingFiles(prev => ({ ...prev, [itemId]: true }));

    try {
      console.log('[DOWNLOAD] Starting download for:', fileName);
      console.log('[DOWNLOAD] Signed URL:', designFileUrls[itemId]);

      // Fetch the file from the signed URL
      const response = await fetch(designFileUrls[itemId]);
      console.log('[DOWNLOAD] Response status:', response.status);
      console.log('[DOWNLOAD] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) throw new Error('Failed to download file');

      // Get the blob
      const blob = await response.blob();
      console.log('[DOWNLOAD] Blob size:', blob.size, 'bytes');
      console.log('[DOWNLOAD] Blob type:', blob.type);

      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('[DOWNLOAD] Download triggered successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const loadOrderDetails = async () => {
    if (!order) return;

    try {
      // Load status history
      const history = await getOrderStatusHistory(order.id);
      setStatusHistory(history);

      // Load operators
      const ops = await getOperators();
      setOperators(ops);

      // Load payment proof if exists
      if (order.payment_proof_file_id) {
        try {
          const url = await getFileUrl(order.payment_proof_file_id);
          setPaymentProofUrl(url);
        } catch (error) {
          console.error('Error loading payment proof:', error);
          setPaymentProofUrl(null);
        }
      }

      // Load design file URLs with signed URLs
      const urls: Record<string, string> = {};
      for (const item of order.items || []) {
        if (item.design_file_url) {
          try {
            const signedUrl = await getSignedUrlFromPath(item.design_file_url);
            urls[item.id] = signedUrl;
          } catch (error) {
            console.error('Error loading file URL for item:', item.id, error);
          }
        }
      }
      setDesignFileUrls(urls);
    } catch (error) {
      console.error('Error loading order details:', error);
      // Continue even if some data fails to load
    }
  };

  const handleApprovePayment = async () => {
    if (!order) return;

    try {
      setLoading(true);
      await approvePayment(order.id, currentUserId);
      alert('Payment approved! Order moved to production.');
      onOrderUpdated();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!order || !rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      await rejectPayment(order.id, currentUserId, rejectReason);
      alert('Payment rejected. Customer will be notified.');
      onOrderUpdated();
      setShowRejectDialog(false);
      setRejectReason('');
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOperator = async () => {
    if (!order || !selectedOperator) {
      alert('Please select an operator');
      return;
    }

    try {
      setLoading(true);
      await assignToOperator(order.id, selectedOperator, currentUserId);
      alert('Order assigned to operator');
      onOrderUpdated();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to assign operator');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      setLoading(true);
      await updateOrderStatus(order.id, newStatus, currentUserId);
      alert('Order status updated');
      onOrderUpdated();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to update status');
    } finally {
      setLoading(false);
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

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <Package className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h2>
                <p className="text-sm text-gray-600">Created {new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(order.status)}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{order.customer_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{order.customer_email}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h3>
              {order.shipping_address ? (
                <div className="text-gray-900">
                  <p>{order.shipping_address.name}</p>
                  <p>{order.shipping_address.street}</p>
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </div>
              ) : (
                <p className="text-gray-500">No address provided</p>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.design_file_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.material_name} - {item.thickness}mm
                        </p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)}
                        </p>
                      </div>
                      {designFileUrls[item.id] && (
                        <button
                          onClick={() => handleDownloadFile(item.id, item.design_file_name)}
                          disabled={downloadingFiles[item.id]}
                          className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center gap-1 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          {downloadingFiles[item.id] ? 'Downloading...' : 'Download'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="font-medium text-gray-900">${order.subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tax</p>
                  <p className="font-medium text-gray-900">${order.tax.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Shipping</p>
                  <p className="font-medium text-gray-900">${order.shipping_cost.toFixed(2)}</p>
                </div>
              </div>
              <div className="border-t border-gray-300 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-900">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">${order.total_amount.toFixed(2)}</p>
                </div>
              </div>

              {/* Payment Proof */}
              {order.payment_proof_file_id && (
                <div className="mt-4 border-t border-gray-300 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Payment Proof</p>
                  {paymentProofUrl && (
                    <div className="space-y-2">
                      <a
                        href={paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                      >
                        <Image className="w-4 h-4" />
                        View Payment Proof
                      </a>
                      <p className="text-xs text-gray-500">
                        Uploaded {order.payment_proof_uploaded_at ? new Date(order.payment_proof_uploaded_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  )}
                  {order.payment_confirmed_at && (
                    <div className="mt-2 text-sm">
                      <p className="text-green-700 font-medium">✓ Confirmed by {order.payment_confirmed_by_name || 'Admin'}</p>
                      <p className="text-gray-600">{new Date(order.payment_confirmed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Operator Assignment */}
            {order.status === 'in_production' && !order.assigned_operator_id && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Assign to Operator
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Select Operator</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.full_name || op.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignOperator}
                    disabled={loading || !selectedOperator}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    Assign
                  </button>
                </div>
              </div>
            )}

            {/* Operator Info */}
            {order.assigned_operator_id && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Assigned Operator
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Operator</p>
                    <p className="font-medium text-gray-900">{order.operator_name || order.operator_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned</p>
                    <p className="font-medium text-gray-900">
                      {order.assigned_at ? new Date(order.assigned_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                {order.operator_notes && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-gray-900 bg-white p-3 rounded border border-gray-200 mt-1">{order.operator_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status History */}
            {statusHistory.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status History
                </h3>
                <div className="space-y-2">
                  {statusHistory.map((entry) => (
                    <div key={entry.id} className="bg-white rounded p-3 text-sm border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.old_status && <span className="text-gray-500">{entry.old_status}</span>}
                          {entry.old_status && <span className="text-gray-400">→</span>}
                          <span className="font-medium text-gray-900">{entry.new_status}</span>
                        </div>
                        <span className="text-gray-500">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      {entry.changed_by_user && (
                        <p className="text-gray-600 mt-1">By: {entry.changed_by_user.full_name || entry.changed_by_user.email}</p>
                      )}
                      {entry.notes && <p className="text-gray-600 mt-1">Note: {entry.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-wrap gap-3">
                {/* Payment Approval Actions */}
                {order.status === 'confirmation_pending' && (
                  <>
                    <button
                      onClick={handleApprovePayment}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve Payment
                    </button>
                    <button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject Payment
                    </button>
                  </>
                )}

                {/* Status Update Actions */}
                {order.status === 'in_production' && order.assigned_operator_id && (
                  <button
                    onClick={() => handleUpdateStatus('cutting')}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                  >
                    Start Cutting
                  </button>
                )}

                {order.status === 'packaging' && (
                  <button
                    onClick={() => handleUpdateStatus('shipped')}
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    Mark as Shipped
                  </button>
                )}

                {order.status === 'shipped' && (
                  <button
                    onClick={() => handleUpdateStatus('delivered')}
                    disabled={loading}
                    className="px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:bg-gray-400 transition-colors"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Payment Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowRejectDialog(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Payment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this payment. The customer will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 min-h-[100px]"
              disabled={loading}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRejectPayment}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                Reject Payment
              </button>
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
