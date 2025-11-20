import { useState, useEffect } from 'react';
import { LogOut, Wrench } from 'lucide-react';
import JobQueue from './components/JobQueue';
import JobDetailsModal from './components/JobDetailsModal';
import LoginPage from './components/LoginPage';
import { getCurrentUser, signOut, onAuthStateChange, type User } from './lib/auth';
import { type Job } from './services/operator-jobs';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) {
          setUser(currentUser);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (newUser) => {
      if (mounted) {
        setUser(newUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const handleJobUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowJobModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login page
  if (!user) {
    return <LoginPage />;
  }

  // Not an operator
  if (user.role !== 'operator') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Access Denied</h2>
          <p className="text-red-800 mb-6">
            This portal is for operators only. Your account role is: <strong>{user.role}</strong>
          </p>
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Operator Portal</h1>
                <p className="text-sm text-gray-600">Welcome, {user.full_name || user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JobQueue
          key={refreshTrigger}
          operatorId={user.id}
          onViewJob={handleViewJob}
        />
      </main>

      {/* Job Details Modal */}
      <JobDetailsModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        job={selectedJob}
        operatorId={user.id}
        onJobUpdated={handleJobUpdated}
      />
    </div>
  );
}

export default App;
