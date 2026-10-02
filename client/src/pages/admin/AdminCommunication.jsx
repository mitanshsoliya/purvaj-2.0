import React from 'react';
import { useLocation } from 'react-router-dom';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminCommunication = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Retailer Broadcast Center';
  if (path.includes('notifications')) title = 'Automated System Notifications';
  else if (path.includes('history')) title = 'Communication Dispatch History';

  return (
    <ModulePlaceholder
      title={title}
      category="Communication Hub"
      description="Send bulk WhatsApp broadcasts, SMS stock arrival notices, app push notifications, and festival wishes to retail shops."
      plannedPhase="Phase 11 Communication & Messaging Engine"
      apiEndpoint="/api/admin/broadcasts"
      dbTable="public.broadcast_messages, public.message_templates"
      features={[
        'WhatsApp Business API integration for bulk price sheets',
        'New stock arrival instant broadcasts',
        'Targeted messaging by shop tier or geographic zone',
        'Delivery dispatch alerts with tracking links',
      ]}
    />
  );
};

export default AdminCommunication;
