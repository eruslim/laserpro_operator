import { useState, useEffect } from 'react';
import { Package, Clock, Play, Eye } from 'lucide-react';
import { type Job, getAssignedJobs, startProduction } from '../services/operator-jobs';

interface JobQueueProps {
  operatorId: string;
  onViewJob: (job: Job) => void;
}

export default function JobQueue({ operatorId, onViewJob }: JobQueueProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('active');

  useEffect(() => {
    loadJobs();
  }, [operatorId]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await getAssignedJobs(operatorId);
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
      alert('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProduction = async (jobId: string) => {
    if (!confirm('Start production on this job?')) return;

    try {
      await startProduction(jobId, operatorId);
      await loadJobs();
      alert('Production started!');
    } catch (error) {
      console.error('Error starting production:', error);
      alert('Failed to start production');
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'pending') return job.status === 'in_production';
    if (filter === 'active') return job.status !== 'in_production' && job.status !== 'packaging';
    return true;
  });

  const statusColors: Record<string, string> = {
    in_production: 'bg-yellow-100 text-yellow-800',
    cutting: 'bg-blue-100 text-blue-800',
    post_processing: 'bg-purple-100 text-purple-800',
    quality_check: 'bg-orange-100 text-orange-800',
    packaging: 'bg-green-100 text-green-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Jobs</h1>
        <p className="text-gray-600">Jobs assigned to you</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({jobs.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending Start ({jobs.filter(j => j.status === 'in_production').length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In Progress ({jobs.filter(j => j.status !== 'in_production' && j.status !== 'packaging').length})
        </button>
      </div>

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No jobs found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg shadow border-2 border-gray-200 p-6 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{job.order_number}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        statusColors[job.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600">Customer: {job.customer_name}</p>
                  <p className="text-sm text-gray-500">{job.customer_email}</p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Clock className="w-4 h-4" />
                    Assigned: {new Date(job.assigned_at).toLocaleDateString()}
                  </div>
                  {job.estimated_completion && (
                    <p className="text-sm text-gray-600">
                      Due: {new Date(job.estimated_completion).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                <div className="bg-gray-50 rounded p-3">
                  {job.items?.slice(0, 2).map((item, idx) => (
                    <p key={idx} className="text-sm text-gray-600">
                      • {item.design_file_name} ({item.material_name}, {item.thickness}mm) x{item.quantity}
                    </p>
                  ))}
                  {(job.items?.length || 0) > 2 && (
                    <p className="text-sm text-gray-500 mt-1">
                      +{(job.items?.length || 0) - 2} more items
                    </p>
                  )}
                </div>
              </div>

              {job.operator_notes && (
                <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-900 mb-1">Notes:</p>
                  <p className="text-sm text-yellow-800">{job.operator_notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {job.status === 'in_production' ? (
                  <button
                    onClick={() => handleStartProduction(job.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Start Production
                  </button>
                ) : (
                  <button
                    onClick={() => onViewJob(job)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View & Update
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
