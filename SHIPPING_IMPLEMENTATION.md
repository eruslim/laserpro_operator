# Shipping Workflow Implementation - Operator Portal

## Summary
Add shipping functionality to the operator portal when job status is "packaging".

## Changes Made

### 1. Database Migration ✅
- Added `shipped_at` timestamp column
- Added `tracking_url` text column
- Updated status constraint to include 'shipped'
- File: `/d/LaserCutPro/website/supabase/migrations/20250119000003_add_shipping_fields.sql`

### 2. Service Layer ✅
- Added `shipOrder()` function to `operator-jobs.ts`
- Updated `Job` interface to include:
  - `shipping_address: any`
  - `tracking_number: string | null`
  - `tracking_url: string | null`

### 3. UI Changes Needed (JobDetailsModal.tsx)

#### A. Import shipOrder function
```typescript
import {
  shipOrder,  // ADD THIS
  // ... other imports
} from '../services/operator-jobs';
```

#### B. Add state for tracking info
```typescript
const [trackingNumber, setTrackingNumber] = useState('');
const [trackingUrl, setTrackingUrl] = useState('');
```

#### C. Add handleShipOrder function
```typescript
const handleShipOrder = async () => {
  if (!job) return;

  if (!trackingNumber && !trackingUrl) {
    if (!confirm('Ship without tracking information?')) return;
  }

  try {
    setSaving(true);
    await shipOrder(job.id, operatorId, trackingNumber, trackingUrl);
    alert('Order marked as shipped!');
    onJobUpdated();
    onClose();
  } catch (error) {
    console.error('Error shipping order:', error);
    alert('Failed to ship order');
  } finally {
    setSaving(false);
  }
};
```

#### D. Add shipping address section (after Production Notes section)
```tsx
{/* Shipping Information - Only show when packaging */}
{job.status === 'packaging' && job.shipping_address && (
  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <Package className="w-5 h-5 text-blue-600" />
      Shipping Information
    </h3>
    <div className="bg-white rounded-lg p-4 mb-4">
      <h4 className="font-medium text-gray-900 mb-2">Deliver To:</h4>
      <p className="text-gray-700">{job.shipping_address.recipient_name}</p>
      <p className="text-gray-600">{job.shipping_address.street_address}</p>
      <p className="text-gray-600">
        {job.shipping_address.city}, {job.shipping_address.state} {job.shipping_address.postal_code}
      </p>
      {job.shipping_address.phone && (
        <p className="text-gray-600 mt-2">Phone: {job.shipping_address.phone}</p>
      )}
    </div>

    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tracking Number (Optional)
        </label>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tracking URL (Optional)
        </label>
        <input
          type="url"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="https://tracking.courier.com/..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  </div>
)}
```

#### E. Update Action Buttons (replace existing actions section)
```tsx
{/* Actions */}
<div className="flex gap-3 pt-4 border-t border-gray-200">
  {job.status === 'packaging' ? (
    <button
      onClick={handleShipOrder}
      disabled={saving}
      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-400"
    >
      <Package className="w-5 h-5" />
      {saving ? 'Shipping...' : 'Mark as Shipped'}
    </button>
  ) : currentNextStatus && (
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
```

## Testing Steps

1. Create an order as customer
2. Admin confirms payment and assigns to operator
3. Operator moves job through: cutting → post_processing → quality_check → packaging
4. When at "packaging" status:
   - Shipping address should be displayed
   - Tracking number and URL inputs appear
   - Button changes to "Mark as Shipped" (green)
5. Click "Mark as Shipped"
6. Order status changes to "shipped"
7. Customer can see tracking info in their orders

## Status Flow
```
pending → confirmation_pending → in_production → cutting →
post_processing → quality_check → packaging → shipped → delivered
```
