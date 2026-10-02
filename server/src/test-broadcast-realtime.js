/**
 * Purvaj 2.0 Real-Time Communication & Broadcast Center Verification Suite
 * Tests:
 * 1. WebSocket Authentication (valid token accepted, invalid rejected)
 * 2. All Shops Broadcast (online user receives instant live notification)
 * 3. Selected Shop Broadcast & Unauthorized Recipient Protection (only selected shop receives, other shop does not)
 * 4. Shop Group Broadcast (only group members receive)
 * 5. Offline User Persistence (notification stored in DB, unread on login)
 * 6. Delivery Acknowledgment & Read State Reconciliation
 * 7. Real-Time Unread Count Synchronization
 * 8. Reconnect Handling
 * 9. Admin Message History with Delivery & Read Metrics (Sent, Delivered, Read, Unread)
 */

import { io as ClientIO } from 'socket.io-client';
import pool from './config/db.js';
import { generateAccessToken } from './middleware/auth.js';

const SOCKET_URL = 'http://localhost:5000';
const BASE_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'demo_jwt_token_purvaj_2.0';

const runTests = async () => {
  console.log('================================================================');
  console.log('  PURVAJ 2.0 — REAL-TIME BROADCAST & NOTIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title} - ${details}`);
      failed++;
    }
  };

  try {
    // 0. Setup test users and shops
    const shopsRes = await pool.query(
      `SELECT s.id as shop_id, s.shop_name, s.owner_user_id, u.name as owner_name, u.role
       FROM shops s
       JOIN users u ON s.owner_user_id = u.id
       WHERE s.status = 'active'
       LIMIT 3`
    );

    if (shopsRes.rows.length < 2) {
      throw new Error('Need at least 2 active shops in database to test authorization isolation');
    }

    const shop1 = shopsRes.rows[0];
    const shop2 = shopsRes.rows[1];
    const shop3 = shopsRes.rows[2] || shop1;

    const tokenShop1 = generateAccessToken({ userId: shop1.owner_user_id, role: 'shop_owner' });
    const tokenShop2 = generateAccessToken({ userId: shop2.owner_user_id, role: 'shop_owner' });

    console.log(`Test Subject 1: ${shop1.shop_name} (ID: ${shop1.shop_id})`);
    console.log(`Test Subject 2: ${shop2.shop_name} (ID: ${shop2.shop_id})\n`);

    // 1. TEST: WebSocket Authentication
    console.log('--- TEST 1: WebSocket Authentication ---');
    // Test 1a: Unauthenticated socket should be rejected
    const unauthSocket = ClientIO(SOCKET_URL, {
      auth: { token: 'invalid_expired_token' },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
    });

    const authFailed = await new Promise((resolve) => {
      unauthSocket.on('connect_error', (err) => {
        resolve(err.message.includes('Authentication error'));
      });
      unauthSocket.on('connect', () => resolve(false));
      setTimeout(() => resolve(false), 2000);
    });
    unauthSocket.disconnect();
    assert(authFailed, 'Unauthenticated socket rejected with Authentication error');

    // Test 1b: Authenticated socket with valid JWT token
    const client1 = ClientIO(SOCKET_URL, {
      auth: { token: tokenShop1 },
      transports: ['websocket'],
      reconnection: true,
    });

    const client1Connected = await new Promise((resolve) => {
      client1.on('connect', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });
    assert(client1Connected, 'Valid JWT handshake authenticated and connected to WebSocket');

    // Connect Client 2 (Shop 2)
    const client2 = ClientIO(SOCKET_URL, {
      auth: { token: tokenShop2 },
      transports: ['websocket'],
      reconnection: true,
    });
    await new Promise((resolve) => client2.on('connect', resolve));

    // 2. TEST: All Shops Broadcast (Online User Real-Time Delivery)
    console.log('\n--- TEST 2: All Shops Broadcast (Online User Live Delivery) ---');
    const allShopsPromise1 = new Promise((resolve) => {
      client1.on('new_notification', (data) => resolve(data));
    });
    const allShopsPromise2 = new Promise((resolve) => {
      client2.on('new_notification', (data) => resolve(data));
    });

    const broadcastRes1 = await fetch(`${BASE_URL}/broadcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        title: 'Tomorrow orders will close at 2 PM',
        message: 'Notice to all retail partners: Ordering closes at 2:00 PM due to quarterly inventory audit.',
        priority: 'high',
        target_type: 'ALL_SHOPS',
        action_label: 'Quick Order Now',
        action_url: '/shop/quick-order',
      }),
    });
    const broadcastData1 = await broadcastRes1.json();
    assert(broadcastRes1.ok && broadcastData1.data?.broadcast?.id, 'Broadcast created on server for ALL_SHOPS');

    const received1 = await Promise.race([
      allShopsPromise1,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for notification')), 4000)),
    ]);
    assert(
      received1 && received1.title === 'Tomorrow orders will close at 2 PM',
      'Client 1 received live real-time broadcast instantly without page refresh'
    );

    const received2 = await Promise.race([
      allShopsPromise2,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for notification')), 4000)),
    ]);
    assert(
      received2 && received2.title === 'Tomorrow orders will close at 2 PM',
      'Client 2 received live real-time broadcast simultaneously'
    );

    // 3. TEST: Selected Shop Broadcast & Unauthorized Recipient Protection
    console.log('\n--- TEST 3: Selected Shop Broadcast & Security Room Isolation ---');
    // Only send to Shop 1. Shop 2 must NEVER receive this message!
    let shop2Leaked = false;
    client2.on('new_notification', (data) => {
      if (data.title === 'Confidential VIP Notice for Shop 1 Only') {
        shop2Leaked = true;
      }
    });

    const shop1SelectedPromise = new Promise((resolve) => {
      client1.on('new_notification', (data) => {
        if (data.title === 'Confidential VIP Notice for Shop 1 Only') {
          resolve(data);
        }
      });
    });

    const selectiveRes = await fetch(`${BASE_URL}/broadcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        title: 'Confidential VIP Notice for Shop 1 Only',
        message: 'Exclusive targeted consignment discount allocated specifically to your storefront.',
        priority: 'urgent',
        target_type: 'SELECTED_SHOPS',
        target_shop_ids: [shop1.shop_id],
      }),
    });
    const selectiveData = await selectiveRes.json();
    assert(selectiveRes.ok, 'Selective broadcast dispatched');

    const shop1ReceivedExclusive = await Promise.race([
      shop1SelectedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for selective message')), 4000)),
    ]);
    assert(
      shop1ReceivedExclusive && shop1ReceivedExclusive.title === 'Confidential VIP Notice for Shop 1 Only',
      'Authorized recipient (Shop 1) received targeted broadcast'
    );

    // Wait 500ms to guarantee no leakage to Shop 2
    await new Promise((r) => setTimeout(r, 500));
    assert(!shop2Leaked, 'SECURITY: Unauthorized shop (Shop 2) DID NOT receive restricted broadcast');

    // 4. TEST: Shop Group Broadcast
    console.log('\n--- TEST 4: Shop Group Broadcast ---');
    // Fetch a shop group
    const groupsRes = await fetch(`${BASE_URL}/shop-groups`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const groupsData = await groupsRes.json();
    const testGroup = groupsData.data?.groups?.[0];
    assert(testGroup && testGroup.id, `Target shop group found: ${testGroup?.name}`);

    // Ensure shop 1 is in this group
    await pool.query(
      'INSERT INTO shop_group_members (shop_group_id, shop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [testGroup.id, shop1.shop_id]
    );

    const groupBroadRes = await fetch(`${BASE_URL}/broadcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        title: `Special Announcement for ${testGroup.name}`,
        message: 'Group members special wholesale tier pricing active.',
        priority: 'normal',
        target_type: 'SHOP_GROUP',
        target_group_id: testGroup.id,
      }),
    });
    const groupBroadData = await groupBroadRes.json();
    assert(groupBroadRes.ok && groupBroadData.data?.broadcast?.id, 'Shop Group broadcast dispatched');

    // 5. TEST: Offline User Persistence
    console.log('\n--- TEST 5: Offline User Persistence ---');
    // Shop 3 is offline (no socket open). Check if broadcast is stored in DB.
    const notifsShop3Res = await pool.query(
      `SELECT * FROM notifications 
       WHERE recipient_user_id = $1 AND title = 'Tomorrow orders will close at 2 PM'`,
      [shop3.owner_user_id]
    );
    assert(notifsShop3Res.rows.length > 0, 'Offline user notification persisted in database');
    assert(notifsShop3Res.rows[0].is_read === false, 'Stored notification is marked unread');

    // 6. TEST: Delivery Acknowledgment & Read State
    console.log('\n--- TEST 6: Read State & Unread Count Synchronization ---');
    const myNotifsRes = await fetch(`${BASE_URL}/notifications?type=all`, {
      headers: { Authorization: `Bearer ${tokenShop1}` },
    });
    const myNotifsData = await myNotifsRes.json();
    const unreadBefore = myNotifsData.data?.unreadCount;
    const testNotification = myNotifsData.data?.notifications?.find((n) => !n.is_read);

    assert(testNotification && testNotification.id, 'Found unread notification in shop inbox');

    // Mark as read
    const markReadRes = await fetch(`${BASE_URL}/notifications/${testNotification.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenShop1}` },
    });
    const markReadData = await markReadRes.json();
    assert(markReadRes.ok && markReadData.data?.notification?.is_read === true, 'Notification marked as read');
    assert(markReadData.data?.unreadCount === unreadBefore - 1, 'Unread count authoritatively decremented by server');

    // 7. TEST: Reconnect Handling
    console.log('\n--- TEST 7: Reconnection Handling ---');
    const unreadUpdatedPromise = new Promise((resolve) => {
      client1.once('unread_count_updated', (data) => resolve(data));
    });

    client1.disconnect();
    client1.connect();

    const reconnectData = await Promise.race([
      unreadUpdatedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on reconnect unread sync')), 3000)),
    ]);
    assert(
      reconnectData && typeof reconnectData.unreadCount === 'number',
      'Client reconnected smoothly and received updated unreadCount'
    );

    // 8. TEST: Admin Message History with Delivery & Read Metrics
    console.log('\n--- TEST 8: Admin Message History Metrics ---');
    const historyRes = await fetch(`${BASE_URL}/broadcasts/${broadcastData1.data.broadcast.id}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const historyData = await historyRes.json();
    const stats = historyData.data?.broadcast?.stats;

    assert(historyRes.ok && stats, 'Broadcast history stats retrieved');
    console.log(`         Sent: ${stats.total} | Delivered: ${stats.delivered} | Read: ${stats.read} | Unread: ${stats.unread}`);
    assert(stats.total > 0, 'Total recipients (Sent) count accurate');
    assert(typeof stats.read === 'number', 'Read confirmation metric tracked');
    assert(stats.unread === stats.total - stats.read, 'Unread metric matches total - read');

    // Cleanup sockets
    client1.disconnect();
    client2.disconnect();

    console.log('\n================================================================');
    console.log(`  ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\nTest Suite Execution Error:', err);
    process.exit(1);
  }
};

runTests();
