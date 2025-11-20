import { useState, useEffect } from 'react';
import { X, Package, FileText, Clock, Download, Save, ChevronRight } from 'lucide-react';
import {
  type Job,
  type ProductionStatus,
  updateJobStatus,
  addProductionNotes,
  getJobStatusHistory,
  getSignedUrlFromPath,
} from '../services/operator-jobs';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  operatorId: string;
  onJobUpdated: () => void;
}

export default function JobDetailsModal({
  isOpen,
  onClose,
  job,
  operatorId,
  onJobUpdated,
}: JobDetailsModalProps) {
  const [notes, setNotes] = useState('');
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [designFileUrls, setDesignFileUrls] = useState<Record<string, string>>({});
  const [downloadingFiles, setDownloadingFiles] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      setNotes(job.operator_notes || '');
      loadJobDetails();
    }
  }, [isOpen, job]);

  const loadJobDetails = async () => {
    if (!job) return;

    try {
      // Load status history
      const history = await getJobStatusHistory(job.id);
      setStatusHistory(history);

      // Load design file URLs
      const urls: Record<string, string> = {};
      for (const item of job.items || []) {
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
      console.error('Error loading job details:', error);
    }
  };

  const handleDownloadFile = async (itemId: string, fileName: string) => {
    if (!designFileUrls[itemId]) return;

    setDownloadingFiles(prev => ({ ...prev, [itemId]: true }));

    try {
      const response = await fetch(designFileUrls[itemId]);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleUpdateStatus = async (newStatus: ProductionStatus) => {
    if (!job) return;

    const statusNames: Record<ProductionStatus, string> = {
      cutting: 'Cutting',
      post_processing: 'Post-Processing',
      quality_check: 'Quality Check',
      packaging: 'Packaging',
    };

    if (!confirm(`Move job to ${statusNames[newStatus]}?`)) return;

    try {
      setSaving(true);
      await updateJobStatus(job.id, newStatus, operatorId, notes);
      alert(`Status updated to ${statusNames[newStatus]}`);
      onJobUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!job) return;

    try {
      setSaving(true);
      await addProductionNotes(job.id, notes, operatorId);
      alert('Notes saved');
      onJobUpdated();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !job) return null;

  const nextStatus: Record<string, ProductionStatus | null> = {
    cutting: 'post_processing',
    post_processing: 'quality_check',
    quality_check: 'packaging',
    packaging: null,
  };

  const currentNextStatus = nextStatus[job.status] || null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{job.order_number}</h2>
            <p className="text-gray-600">Customer: {job.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Current Status
            </h3>
            <p className="text-2xl font-bold text-blue-900">
              {job.status.replace('_', ' ').toUpperCase()}
            </p>
            {job.production_started_at && (
              <p className="text-sm text-gray-600 mt-2">
                Started: {new Date(job.production_started_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Items to Produce
            </h3>
            <div className="space-y-3">
              {job.items?.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.design_file_name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.material_name} - {item.thickness}mm
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
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

          {/* Production Notes */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Production Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Add notes about the production process..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Status History
              </h3>
              <div className="space-y-2">
                {statusHistory.map((entry, idx) => (
                  <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{entry.old_status}</span>
                        <ChevronRight className="w-4 h-4 inline mx-2 text-gray-400" />
                        <span className="font-medium text-gray-900">{entry.new_status}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.changed_by_user && (
                      <p className="text-sm text-gray-600 mt-1">
                        By: {entry.changed_by_user.full_name}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1 italic">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {currentNextStatus && (
              <button
                onClick={() => handleUpdateStatus(currentNextStatus)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
              >
                <ChevronRight className="w-5 h-5" />
                Move to {currentNextStatus.replace('_', ' ').toUpperCase()}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
