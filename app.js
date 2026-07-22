// order-dashboard/app.js
// Logic xử lý gọi API PostgREST, hiển thị dữ liệu & Quản lý biểu đồ Chart.js
// =========================================================================

// 1. SUPABASE CONFIGURATION & INSTANCE INIT
const SUPABASE_URL = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url) 
  ? SUPABASE_CONFIG.url 
  : 'https://xlgovgynbsahuykyjzcx.supabase.co';
  
const SUPABASE_ANON_KEY = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.anonKey) 
  ? SUPABASE_CONFIG.anonKey 
  : 'sb_publishable_i7Ox-gsXTnPbP_AghSxb4Q_w6-5vbMg';

var sbInstance = null;

function initSupabase() {
  if (!sbInstance) {
    const createClientFn = window.supabase?.createClient || window.supabaseClient?.createClient;
    if (createClientFn) {
      sbInstance = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }
  return sbInstance;
}

let allOrders = [];
let customerMap = {};
let currentPage = 1;
let perPage = 20;

// DOM Elements
const navTabOrders = document.getElementById('nav-tab-orders');
const navTabCustomers = document.getElementById('nav-tab-customers');
const navTabUsers = document.getElementById('nav-tab-users');
const sectionOrders = document.getElementById('section-orders');
const sectionCustomers = document.getElementById('section-customers');
const sectionUsers = document.getElementById('section-users');

const searchInput = document.getElementById('search-input');
const deviceFilter = document.getElementById('device-filter');
const platformFilter = document.getElementById('platform-filter');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const refreshBtn = document.getElementById('refresh-btn');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const mobileOrdersContainer = document.getElementById('mobile-orders-container');
const desktopTableBody = document.getElementById('desktop-table-body');
const statTotalOrders = document.getElementById('stat-total-orders');
const statTotalCod = document.getElementById('stat-total-cod');
const pageInfo = document.getElementById('page-info');
const perPageEl = document.getElementById('per-page');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// Customer Elements
const searchCustomerInput = document.getElementById('search-customer-input');
const customerTableBody = document.getElementById('customer-table-body');
const statTotalCustomers = document.getElementById('stat-total-customers');
const customerCountInfo = document.getElementById('customer-count-info');
const custTierFilter = document.getElementById('cust-tier-filter');
const custCarrierFilter = document.getElementById('cust-carrier-filter');
const btnCustClearFilter = document.getElementById('btn-cust-clear-filter');

let realtimeChannel = null;

document.addEventListener('DOMContentLoaded', () => {
  setupTabSwitching();
  setupRightMenu();
  fetchOrders();
  subscribeRealtime();
  checkLoginStatus();
});

// 2. AUTHENTICATION & LOGIN MANAGEMENT
let currentUser = null;
let allUsers = [];

function checkLoginStatus() {
  const stored = localStorage.getItem('af_logged_user');
  if (stored) {
    currentUser = JSON.parse(stored);
    updateHeaderAdminInfo(currentUser.email);
  } else {
    // Nếu chưa đăng nhập, tự động chuyển sang trang login.html
    window.location.href = 'login.html';
  }
}

function updateHeaderAdminInfo(email) {
  const headerName = document.getElementById('header-admin-name');
  const headerAvatar = document.getElementById('header-admin-avatar');
  const rightName = document.getElementById('right-admin-name');
  const rightEmail = document.getElementById('right-admin-email');
  const rightAvatar = document.getElementById('right-admin-avatar');

  const username = email.split('@')[0];
  const initial = email.charAt(0).toUpperCase();

  if (headerName) headerName.textContent = username;
  if (rightName) rightName.textContent = username;
  if (rightEmail) rightEmail.textContent = email;
  if (rightAvatar) rightAvatar.textContent = initial;

  if (headerAvatar) {
    headerAvatar.style.display = 'none';
    let parentNode = headerAvatar.parentNode;
    const oldText = parentNode.querySelector('.avatar-text');
    if (oldText) oldText.remove();
    
    const textNode = document.createElement('span');
    textNode.className = 'avatar-text font-bold text-white text-xs';
    textNode.textContent = initial;
    parentNode.appendChild(textNode);
  }
}

function setupRightMenu() {
  const headerUserMenuBtn = document.getElementById('header-user-menu-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const rightUserMenu = document.getElementById('right-user-menu');
  const rightMenuBackdrop = document.getElementById('right-menu-backdrop');
  const rightMenuCloseBtn = document.getElementById('right-menu-close-btn');

  function openRightMenu() {
    if (rightUserMenu) {
      rightUserMenu.classList.remove('hidden');
      setTimeout(() => {
        rightUserMenu.classList.remove('opacity-0', 'pointer-events-none');
        const panel = document.getElementById('right-menu-panel');
        if (panel) panel.classList.remove('translate-x-full');
      }, 10);
    }
  }

  function closeRightMenu() {
    if (rightUserMenu) {
      const panel = document.getElementById('right-menu-panel');
      if (panel) panel.classList.add('translate-x-full');
      rightUserMenu.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        rightUserMenu.classList.add('hidden');
      }, 200);
    }
  }

  if (headerUserMenuBtn) headerUserMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); openRightMenu(); });
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); openRightMenu(); });
  if (rightMenuCloseBtn) rightMenuCloseBtn.addEventListener('click', closeRightMenu);
  if (rightMenuBackdrop) rightMenuBackdrop.addEventListener('click', closeRightMenu);

  // Wire right menu nav tabs
  const rightNavStats = document.getElementById('right-nav-statistics');
  const rightNavOrders = document.getElementById('right-nav-orders');
  const rightNavCust = document.getElementById('right-nav-customers');
  const rightNavUsers = document.getElementById('right-nav-users');
  const rightNavRefresh = document.getElementById('right-nav-refresh');
  const rightLogoutBtn = document.getElementById('right-menu-logout-btn');

  if (rightNavStats && navTabStatistics) {
    rightNavStats.addEventListener('click', () => { navTabStatistics.click(); closeRightMenu(); });
  }
  if (rightNavOrders && navTabOrders) {
    rightNavOrders.addEventListener('click', () => { navTabOrders.click(); closeRightMenu(); });
  }
  if (rightNavCust && navTabCustomers) {
    rightNavCust.addEventListener('click', () => { navTabCustomers.click(); closeRightMenu(); });
  }
  if (rightNavUsers && navTabUsers) {
    rightNavUsers.addEventListener('click', () => { navTabUsers.click(); closeRightMenu(); });
  }
  if (rightNavRefresh && refreshBtn) {
    rightNavRefresh.addEventListener('click', () => { refreshBtn.click(); closeRightMenu(); });
  }
  if (rightLogoutBtn && sidebarLogoutBtn) {
    rightLogoutBtn.addEventListener('click', () => { sidebarLogoutBtn.click(); closeRightMenu(); });
  }
}

const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
if (sidebarLogoutBtn) {
  sidebarLogoutBtn.addEventListener('click', async () => {
    if (!confirm("Bạn có chắc chắn muốn đăng xuất tài khoản?")) return;
    
    const sb = initSupabase();
    if (sb) await sb.auth.signOut();
    
    localStorage.removeItem('af_logged_user');
    currentUser = null;
    window.location.href = 'login.html';
  });
}

// Lắng nghe thay đổi hai chiều ngầm từ Supabase (Realtime Sync)
function subscribeRealtime() {
  const sb = initSupabase();
  if (!sb || realtimeChannel) return;

  try {
    realtimeChannel = sb
      .channel('public:all_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, (payload) => {
        console.log('⚡ Dữ liệu history Supabase thay đổi:', payload);
        fetchOrdersSilently();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submitted_orders' }, (payload) => {
        console.log('⚡ Dữ liệu submitted_orders Supabase thay đổi:', payload);
        fetchOrdersSilently();
      })
      .subscribe();
  } catch (err) {
    console.warn('Lỗi kết nối Supabase Realtime:', err);
  }
}

async function fetchOrdersSilently() {
  const sb = initSupabase();
  if (!sb) return;

  try {
    const [subRes, histRes] = await Promise.all([
      sb.from('submitted_orders').select('*').order('submitted_at', { ascending: false }).then(r => r, () => ({ data: [] })),
      sb.from('history').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [] }))
    ]);

    const submittedData = (subRes && subRes.data) ? subRes.data : [];
    const historyData = (histRes && histRes.data) ? histRes.data : [];

    const merged = combineOrdersAndSubmitted(historyData, submittedData);

    if (merged.length > 0) {
      allOrders = merged;
      processCustomerData(allOrders);
      updateDeviceFilterOptions(allOrders);
      renderOrders();
      renderCustomers();
    }
  } catch(e) {
    console.warn("Lỗi tải ngầm dữ liệu:", e);
  }
}

const navTabStatistics = document.getElementById('nav-tab-statistics');
const sectionStatistics = document.getElementById('section-statistics');

// Navigation Tabs Handler
function setupTabSwitching() {
  if (navTabStatistics) {
    navTabStatistics.addEventListener('click', () => {
      setActiveTab(navTabStatistics);
      sectionStatistics.classList.remove('hidden');
      sectionOrders.classList.add('hidden');
      sectionCustomers.classList.add('hidden');
      sectionUsers.classList.add('hidden');
      renderCharts(allOrders);
    });
  }

  if (navTabOrders) {
    navTabOrders.addEventListener('click', () => {
      setActiveTab(navTabOrders);
      sectionOrders.classList.remove('hidden');
      sectionStatistics.classList.add('hidden');
      sectionCustomers.classList.add('hidden');
      sectionUsers.classList.add('hidden');
    });
  }

  if (navTabCustomers) {
    navTabCustomers.addEventListener('click', () => {
      setActiveTab(navTabCustomers);
      sectionCustomers.classList.remove('hidden');
      sectionStatistics.classList.add('hidden');
      sectionOrders.classList.add('hidden');
      sectionUsers.classList.add('hidden');
      renderCustomers();
    });
  }

  if (navTabUsers) {
    navTabUsers.addEventListener('click', () => {
      setActiveTab(navTabUsers);
      sectionUsers.classList.remove('hidden');
      sectionStatistics.classList.add('hidden');
      sectionOrders.classList.add('hidden');
      sectionCustomers.classList.add('hidden');
      fetchUsers();
    });
  }
}

function setActiveTab(activeTabEl) {
  const tabs = [navTabStatistics, navTabOrders, navTabCustomers, navTabUsers];
  tabs.forEach(tab => {
    if (tab) {
      if (tab === activeTabEl) {
        tab.className = "w-full flex items-center gap-3 px-3 py-2 rounded-md bg-[#3C7363] text-white font-bold transition-all shadow-sm";
      } else {
        tab.className = "w-full flex items-center gap-3 px-3 py-2 rounded-md text-brand-darkText/70 hover:bg-[#F1F7F5] hover:text-[#3C7363] transition-all";
      }
    }
  });
}

// ==========================================
// 3. FETCH & PROCESS ORDERS & CUSTOMERS
// ==========================================
function combineOrdersAndSubmitted(historyData, submittedData) {
  const subBySavedId = {};
  const subById = {};
  const subByCode = {};
  const subByPhone = {};

  (submittedData || []).forEach(sub => {
    const tracking = sub.tracking_code || sub.trackingCode || sub.waybill_code || sub.waybillCode || sub.ma_van_don || sub.maVanDon || '';
    if (sub.saved_order_id || sub.savedOrderId) {
      subBySavedId[sub.saved_order_id || sub.savedOrderId] = sub;
    }
    if (sub.id) {
      subById[sub.id] = sub;
    }
    if (sub.order_code || sub.orderCode) {
      const codeKey = String(sub.order_code || sub.orderCode).trim().toLowerCase();
      if (codeKey && codeKey !== '—') subByCode[codeKey] = sub;
    }
    if (sub.phone) {
      const phoneKey = String(sub.phone).replace(/\D/g, '');
      if (phoneKey) subByPhone[phoneKey] = sub;
    }
  });

  const mergedList = [];
  const processedSubIds = new Set();

  (historyData || []).forEach(hist => {
    let res = hist.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }

    const histId = hist.id;
    const histCode = String(hist.order_code || res.orderCode || res.maDon || res.orderNo || '').trim().toLowerCase();
    const histPhone = String(hist.phone || res.phone || res.recipientPhone || '').replace(/\D/g, '');

    const matchedSub = subBySavedId[histId] || subById[histId] || (histCode && subByCode[histCode]) || (histPhone && subByPhone[histPhone]) || null;

    if (matchedSub) {
      processedSubIds.add(matchedSub.id);
      const tracking = matchedSub.tracking_code || matchedSub.trackingCode || matchedSub.waybill_code || matchedSub.waybillCode || matchedSub.ma_van_don || matchedSub.maVanDon || '';
      
      hist.waybill_code = tracking || hist.waybill_code || hist.tracking_code || hist.ma_van_don || '';
      if (typeof res === 'object') {
        res.trackingCode = tracking || res.trackingCode || res.waybillCode || '';
        res.waybillCode = tracking || res.waybillCode || '';
        hist.result = res;
      }
      if (matchedSub.submitted_at || matchedSub.submittedAt) {
        hist.submitted_at = matchedSub.submitted_at || matchedSub.submittedAt;
      }
    }
    mergedList.push(hist);
  });

  (submittedData || []).forEach(sub => {
    if (!processedSubIds.has(sub.id)) {
      const tracking = sub.tracking_code || sub.trackingCode || sub.waybill_code || sub.waybillCode || sub.ma_van_don || sub.maVanDon || '';
      mergedList.push({
        id: sub.id,
        customer_name: sub.name || sub.customer_name || '—',
        phone: sub.phone || '',
        address: sub.address || '—',
        order_code: sub.order_code || sub.orderCode || '—',
        waybill_code: tracking,
        tracking_code: tracking,
        cod_amount: sub.cod_amount || sub.codAmount || 0,
        platform: sub.platform || 'vnpost',
        device_name: sub.device_name || sub.deviceName || '—',
        created_at: sub.submitted_at || sub.submittedAt || sub.created_at || new Date().toISOString(),
        result: {
          name: sub.name || sub.customer_name || '',
          phone: sub.phone || '',
          address: sub.address || '',
          orderCode: sub.order_code || sub.orderCode || '',
          trackingCode: tracking,
          waybillCode: tracking,
          codAmount: sub.cod_amount || sub.codAmount || 0,
          platform: sub.platform || 'vnpost'
        }
      });
    }
  });

  return mergedList;
}

async function fetchOrders() {
  if (loadingState) loadingState.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (mobileOrdersContainer) mobileOrdersContainer.innerHTML = '';
  if (desktopTableBody) desktopTableBody.innerHTML = '';

  const sb = initSupabase();
  if (!sb) {
    if (loadingState) loadingState.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  try {
    const [subRes, histRes] = await Promise.all([
      sb.from('submitted_orders').select('*').order('submitted_at', { ascending: false }).then(r => r, () => ({ data: [] })),
      sb.from('history').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [] }))
    ]);

    const submittedData = (subRes && subRes.data) ? subRes.data : [];
    const historyData = (histRes && histRes.data) ? histRes.data : [];

    const merged = combineOrdersAndSubmitted(historyData, submittedData);

    if (loadingState) loadingState.classList.add('hidden');

    if (!merged || merged.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      updateStats(0, 0);
      return;
    }

    allOrders = merged;
    processCustomerData(allOrders);
    updateDeviceFilterOptions(allOrders);
    renderOrders();
    renderCustomers();

  } catch(e) {
    console.error("Lỗi tải danh sách đơn hàng:", e);
    if (loadingState) loadingState.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
  }
}

function processCustomerData(orders) {
  customerMap = {};
  orders.forEach(item => {
    let res = item.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }

    const name = item.customer_name || res.name || res.recipientName || res.hoTen || '—';
    const phone = item.phone || res.phone || res.recipientPhone || res.sdt || '';
    const address = item.address || res.normalizedAddress || res.address || res.diaChi || '—';
    const cod = Number(res.codAmount || item.cod_amount || res.cod || 0);
    const date = item.created_at || '';
    const platform = res.platform || item.platform || 'vnpost';

    const key = phone ? phone.trim() : name.trim().toLowerCase();
    if (!key || key === '—') return;

    if (!customerMap[key]) {
      customerMap[key] = {
        name: name,
        phone: phone,
        address: address,
        totalOrders: 1,
        totalCod: cod,
        latestDate: date,
        platform: platform,
        note: item.note || ''
      };
    } else {
      customerMap[key].totalOrders += 1;
      customerMap[key].totalCod += cod;
      if (date > customerMap[key].latestDate) {
        customerMap[key].latestDate = date;
        customerMap[key].address = address;
        customerMap[key].platform = platform;
      }
    }
  });
}

let custCurrentPage = 1;
let custPerPage = 20;

function renderCustomers() {
  const keyword = searchCustomerInput ? searchCustomerInput.value.toLowerCase().trim() : '';
  const tierVal = custTierFilter ? custTierFilter.value : 'ALL';
  const carrierVal = custCarrierFilter ? custCarrierFilter.value : 'ALL';

  let list = Object.values(customerMap).filter(c => {
    const matchKeyword = !keyword || 
      c.name.toLowerCase().includes(keyword) || 
      c.phone.includes(keyword) || 
      c.address.toLowerCase().includes(keyword);

    let matchTier = true;
    if (tierVal === 'VIP') matchTier = c.totalOrders >= 3;
    else if (tierVal === 'LOYAL') matchTier = c.totalOrders === 2;
    else if (tierVal === 'NEW') matchTier = c.totalOrders === 1;

    let matchCarrier = true;
    if (carrierVal !== 'ALL') {
      matchCarrier = (c.platform || '').toLowerCase().includes(carrierVal);
    }

    return matchKeyword && matchTier && matchCarrier;
  });

  list.sort((a, b) => b.totalOrders - a.totalOrders || b.totalCod - a.totalCod);

  const vipCount = Object.values(customerMap).filter(c => c.totalOrders >= 3).length;

  if (statTotalCustomers) statTotalCustomers.textContent = Object.keys(customerMap).length;
  const statVipEl = document.getElementById('stat-vip-customers');
  if (statVipEl) statVipEl.textContent = vipCount;

  const totalCust = list.length;
  const totalPages = Math.max(1, Math.ceil(totalCust / custPerPage));
  if (custCurrentPage > totalPages) custCurrentPage = totalPages;
  const start = (custCurrentPage - 1) * custPerPage;
  const pageItems = list.slice(start, start + custPerPage);

  if (customerCountInfo) {
    if (totalCust === 0) {
      customerCountInfo.textContent = 'Hiển thị 0 trong tổng số 0 khách hàng';
    } else {
      customerCountInfo.textContent = `Hiển thị từ ${start + 1} đến ${Math.min(start + custPerPage, totalCust)} trong tổng số ${totalCust} khách hàng`;
    }
  }

  const custBtnPrev = document.getElementById('cust-btn-prev');
  const custBtnNext = document.getElementById('cust-btn-next');
  if (custBtnPrev) custBtnPrev.disabled = custCurrentPage <= 1;
  if (custBtnNext) custBtnNext.disabled = custCurrentPage >= totalPages;

  const mobileCustContainer = document.getElementById('mobile-customers-container');
  if (mobileCustContainer) {
    if (pageItems.length === 0) {
      mobileCustContainer.innerHTML = `<div class="p-8 text-center bg-white rounded-2xl border border-[#EAEAEA] text-[#787774]">Không tìm thấy khách hàng phù hợp.</div>`;
    } else {
      mobileCustContainer.innerHTML = pageItems.map(c => {
        let dateFormatted = '—';
        if (c.latestDate) {
          const d = new Date(c.latestDate);
          if (!isNaN(d.getTime())) {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            dateFormatted = `${dd}/${mm}/${yyyy}`;
          }
        }

        let tierBadge = '';
        if (c.totalOrders >= 3) {
          tierBadge = `<span class="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">Khách VIP</span>`;
        } else if (c.totalOrders === 2) {
          tierBadge = `<span class="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">Thân thiết</span>`;
        } else {
          tierBadge = `<span class="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Khách mới</span>`;
        }

        return `
          <div class="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-sm space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="font-extrabold text-[#111111] text-base hover:underline cursor-pointer" onclick="filterCustomerOrders('${escapeHtml(c.phone || c.name)}')">${escapeHtml(c.name)}</h4>
                <p class="text-xs text-blue-700 font-mono-code font-bold mt-0.5">${escapeHtml(c.phone || '—')}</p>
              </div>
              ${tierBadge}
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs bg-[#F9F9F8] p-3 rounded-xl border border-[#EAEAEA]">
              <div>
                <span class="text-[#787774] text-[11px]">Số đơn mua:</span>
                <div class="font-bold text-[#111111] text-sm mt-0.5">${c.totalOrders} đơn</div>
              </div>
              <div>
                <span class="text-[#787774] text-[11px]">Tổng chi tiêu:</span>
                <div class="font-extrabold text-emerald-800 text-sm mt-0.5">${c.totalCod.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>

            <div class="text-xs text-[#2F3437] leading-relaxed bg-[#F7F6F3] p-2.5 rounded-xl border border-[#EAEAEA]">
              <span class="text-[#787774]">Địa chỉ gần nhất:</span> ${escapeHtml(c.address)}
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-[#EAEAEA] text-xs">
              <div class="flex items-center gap-2">
                <a href="https://facebook.com" target="_blank" class="text-slate-500 hover:text-blue-600 font-semibold">+ Link FB</a>
                <a href="https://zalo.me/${c.phone}" target="_blank" class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">Zalo</a>
              </div>

              <div class="flex items-center gap-1.5">
                <button onclick="openEditCustomerModal('${escapeHtml(c.phone || c.name)}')" class="px-2.5 py-1 rounded-md bg-pastel-blue text-[#1F6C9F] font-bold text-xs">Sửa</button>
                <button onclick="deleteCustomer('${escapeHtml(c.phone || c.name)}')" class="px-2.5 py-1 rounded-md bg-pastel-rose text-[#9F2F2D] font-bold text-xs">Xóa</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (customerTableBody) {
    customerTableBody.innerHTML = pageItems.map(c => {
      let dateFormatted = '—';
      if (c.latestDate) {
        const d = new Date(c.latestDate);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          dateFormatted = `${dd}/${mm}/${yyyy}`;
        }
      }

      let tierBadge = '';
      if (c.totalOrders >= 3) {
        tierBadge = `<span class="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">Khách VIP</span>`;
      } else if (c.totalOrders === 2) {
        tierBadge = `<span class="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">Thân thiết</span>`;
      } else {
        tierBadge = `<span class="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Khách mới</span>`;
      }

      const p = (c.platform || '').toLowerCase();
      let carrierBadge = '';
      if (p.includes('jt') || p.includes('j&t')) {
        carrierBadge = `<span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">J&T Express</span>`;
      } else {
        carrierBadge = `<span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-[#FACC15] text-[#713F12] border border-[#EAB308] shadow-sm">VNPost</span>`;
      }

      return `
        <tr class="hover:bg-[#F9F9F8] transition-colors border-b border-[#EAEAEA] whitespace-nowrap">
          <td class="py-4 px-4 font-semibold text-blue-600 hover:underline cursor-pointer" onclick="filterCustomerOrders('${escapeHtml(c.phone || c.name)}')">${escapeHtml(c.name)}</td>
          <td class="py-4 px-4 font-mono-code text-[#2F3437] font-medium">${escapeHtml(c.phone || '—')}</td>
          <td class="py-4 px-4 text-center font-bold text-[#111111]">${c.totalOrders}</td>
          <td class="py-4 px-4 text-right font-extrabold text-[#111111]">${c.totalCod.toLocaleString('vi-VN')}đ</td>
          <td class="py-4 px-4 text-center font-mono-code text-xs text-[#787774]">${dateFormatted}</td>
          <td class="py-4 px-4 text-center">${tierBadge}</td>
          <td class="py-4 px-4 text-center">${carrierBadge}</td>
          <td class="py-4 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5 text-xs font-semibold">
              <a href="https://facebook.com" target="_blank" class="text-slate-500 hover:text-blue-600 hover:underline">+ Link FB</a>
              <a href="https://zalo.me/${c.phone}" target="_blank" class="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]" title="Mở Zalo">Z</a>
            </div>
          </td>
          <td class="py-4 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="openEditCustomerModal('${escapeHtml(c.phone || c.name)}')" title="Sửa thông tin khách hàng" class="px-2.5 py-1 rounded-md bg-pastel-blue text-[#1F6C9F] text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1">
                <i class="ph ph-pencil-simple text-sm"></i>
                <span>Sửa</span>
              </button>
              <button onclick="deleteCustomer('${escapeHtml(c.phone || c.name)}')" title="Xóa toàn bộ dữ liệu của khách hàng" class="px-2.5 py-1 rounded-md bg-pastel-rose text-[#9F2F2D] text-xs font-bold hover:bg-rose-200 transition-all flex items-center gap-1">
                <i class="ph ph-trash text-sm"></i>
                <span>Xóa</span>
              </button>
              <button onclick="editCustomerNote('${escapeHtml(c.phone || c.name)}', '${escapeHtml(c.note)}')" class="px-2.5 py-1 rounded-md border border-[#EAEAEA] bg-white hover:bg-[#F7F6F3] text-xs font-medium text-[#2F3437] transition-all">
                Ghi chú
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// Hàm Xóa Khách Hàng (Xóa tất cả đơn hàng thuộc vị khách này khỏi Supabase)
async function deleteCustomer(key) {
  const cust = customerMap[key];
  if (!cust) return alert("Không tìm thấy khách hàng!");

  if (!confirm(`⚠️ Bạn có chắc chắn muốn XÓA KHÁCH HÀNG "${cust.name}" (${cust.phone}) và toàn bộ ${cust.totalOrders} đơn hàng của vị khách này khỏi Supabase?`)) return;

  const userOrders = allOrders.filter(o => {
    let res = o.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(err) {} }
    const p = o.phone || res.phone || res.recipientPhone || '';
    const n = o.customer_name || res.name || res.recipientName || '';
    return (p && p.trim() === cust.phone.trim()) || (n && n.trim().toLowerCase() === cust.name.trim().toLowerCase());
  });

  const idsToDelete = userOrders.map(o => o.id);
  if (idsToDelete.length === 0) return alert("Không tìm thấy đơn hàng cần xóa!");

  const sb = initSupabase();
  if (!sb) return alert("Lỗi kết nối Supabase!");

  try {
    const { error } = await sb
      .from('history')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      alert("Lỗi khi xóa khách hàng: " + error.message);
    } else {
      alert(`🎉 Đã xóa thành công khách hàng "${cust.name}" và ${idsToDelete.length} đơn hàng!`);
      fetchOrders();
    }
  } catch(e) {
    alert("Lỗi hệ thống: " + e.message);
  }
}

// Modal Edit Customer Logic
const editCustModal = document.getElementById('edit-customer-modal');
const editCustForm = document.getElementById('edit-customer-form');
const closeCustModalBtn = document.getElementById('close-cust-modal-btn');
const cancelCustModalBtn = document.getElementById('cancel-cust-modal-btn');

function openEditCustomerModal(key) {
  const cust = customerMap[key];
  if (!cust) return alert("Không tìm thấy thông tin khách hàng!");

  document.getElementById('edit-cust-key').value = key;
  const nameInput = document.getElementById('edit-cust-name');
  if (nameInput) nameInput.value = cust.name || '';
  
  document.getElementById('edit-cust-phone').value = cust.phone || '';
  document.getElementById('edit-cust-address').value = cust.address || '';
  document.getElementById('edit-cust-note').value = cust.note || '';

  if (editCustModal) editCustModal.classList.remove('hidden');
}

function closeEditCustomerModal() {
  if (editCustModal) editCustModal.classList.add('hidden');
}

if (closeCustModalBtn) closeCustModalBtn.onclick = closeEditCustomerModal;
if (cancelCustModalBtn) cancelCustModalBtn.onclick = closeEditCustomerModal;

if (editCustForm) {
  editCustForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const key = document.getElementById('edit-cust-key').value;
    const newName = document.getElementById('edit-cust-name').value.trim();
    const newPhone = document.getElementById('edit-cust-phone').value.trim();
    const newAddress = document.getElementById('edit-cust-address').value.trim();
    const newNote = document.getElementById('edit-cust-note').value.trim();

    const cust = customerMap[key];
    if (!cust) return;

    const userOrders = allOrders.filter(o => {
      let res = o.result || {};
      if (typeof res === 'string') { try { res = JSON.parse(res); } catch(err) {} }
      const p = o.phone || res.phone || res.recipientPhone || '';
      const n = o.customer_name || res.name || res.recipientName || '';
      return (p && p.trim() === cust.phone.trim()) || (n && n.trim().toLowerCase() === cust.name.trim().toLowerCase());
    });

    const sb = initSupabase();
    if (!sb) return alert("Lỗi kết nối Supabase!");

    try {
      let updateCount = 0;
      for (let o of userOrders) {
        let res = o.result || {};
        if (typeof res === 'string') { try { res = JSON.parse(res); } catch(err) {} }

        res.name = newName;
        res.recipientName = newName;
        res.phone = newPhone;
        res.recipientPhone = newPhone;
        res.address = newAddress;
        res.normalizedAddress = newAddress;

        const { error } = await sb
          .from('history')
          .update({
            customer_name: newName,
            phone: newPhone,
            address: newAddress,
            note: newNote,
            result: res
          })
          .eq('id', o.id);

        if (!error) updateCount++;
      }

      alert(`🎉 Đã cập nhật thành công thông tin cho khách hàng "${newName}" trên ${updateCount} đơn hàng!`);
      closeEditCustomerModal();
      fetchOrders();
    } catch(err) {
      alert("Lỗi khi cập nhật khách hàng: " + err.message);
    }
  });
}

function editCustomerNote(key, currentNote) {
  const newNote = prompt("✍️ Nhập ghi chú cho khách hàng:", currentNote || '');
  if (newNote !== null) {
    if (customerMap[key]) customerMap[key].note = newNote;
    alert("✅ Đã lưu ghi chú thành công!");
    renderCustomers();
  }
}

function filterCustomerOrders(query) {
  if (navTabOrders) navTabOrders.click();
  if (searchInput) {
    searchInput.value = query;
    renderOrders();
  }
}

if (searchCustomerInput) searchCustomerInput.addEventListener('input', renderCustomers);
if (custTierFilter) custTierFilter.addEventListener('change', renderCustomers);
if (custCarrierFilter) custCarrierFilter.addEventListener('change', renderCustomers);

if (btnCustClearFilter) {
  btnCustClearFilter.addEventListener('click', () => {
    if (searchCustomerInput) searchCustomerInput.value = '';
    if (custTierFilter) custTierFilter.value = 'ALL';
    if (custCarrierFilter) custCarrierFilter.value = 'ALL';
    renderCustomers();
  });
}

const custPerPageEl = document.getElementById('cust-per-page');
if (custPerPageEl) {
  custPerPageEl.addEventListener('change', (e) => {
    custPerPage = Number(e.target.value);
    custCurrentPage = 1;
    renderCustomers();
  });
}

const custBtnPrevEl = document.getElementById('cust-btn-prev');
if (custBtnPrevEl) {
  custBtnPrevEl.addEventListener('click', () => {
    if (custCurrentPage > 1) {
      custCurrentPage--;
      renderCustomers();
    }
  });
}

const custBtnNextEl = document.getElementById('cust-btn-next');
if (custBtnNextEl) {
  custBtnNextEl.addEventListener('click', () => {
    custCurrentPage++;
    renderCustomers();
  });
}

function updateDeviceFilterOptions(list) {
  if (!deviceFilter) return;
  const devices = new Set();
  list.forEach(item => {
    if (item.device_name) devices.add(item.device_name);
    if (item.deviceName) devices.add(item.deviceName);
  });

  const currentVal = deviceFilter.value;
  deviceFilter.innerHTML = '<option value="ALL">Tất cả máy</option>';
  devices.forEach(dev => {
    const opt = document.createElement('option');
    opt.value = dev.toLowerCase();
    opt.textContent = dev;
    deviceFilter.appendChild(opt);
  });
  deviceFilter.value = currentVal;
}

function renderOrders() {
  if (!searchInput || !desktopTableBody) return;
  const keyword = searchInput.value.toLowerCase().trim();
  const selectedDevice = deviceFilter ? deviceFilter.value : 'ALL';
  const selectedPlatform = platformFilter ? platformFilter.value : 'ALL';
  const fromVal = dateFrom ? dateFrom.value : '';
  const toVal = dateTo ? dateTo.value : '';

  const filtered = allOrders.filter(item => {
    let res = item.result || {};
    if (typeof res === 'string') {
      try { res = JSON.parse(res); } catch(e) {}
    }

    const name = (item.customer_name || res.name || res.recipientName || res.hoTen || '').toLowerCase();
    const phone = (item.phone || res.phone || res.recipientPhone || res.sdt || '').toLowerCase();
    const address = (item.address || res.address || res.normalizedAddress || res.diaChi || '').toLowerCase();
    const orderCode = (res.orderCode || item.order_code || res.maDon || '').toLowerCase();
    const waybillCode = (res.waybillCode || res.maVanDon || res.trackingCode || '').toLowerCase();
    const devName = (item.device_name || item.deviceName || '').toLowerCase();
    const platform = (res.platform || item.platform || '').toLowerCase();

    const createdAt = item.created_at || '';
    const dateStr = createdAt.slice(0, 10);
    if (fromVal && dateStr < fromVal) return false;
    if (toVal && dateStr > toVal) return false;

    const matchKeyword = !keyword || 
      name.includes(keyword) || 
      phone.includes(keyword) || 
      orderCode.includes(keyword) ||
      waybillCode.includes(keyword) ||
      address.includes(keyword);

    const matchDevice = selectedDevice === 'ALL' || devName === selectedDevice;
    const matchPlatform = selectedPlatform === 'ALL' || platform === selectedPlatform;

    return matchKeyword && matchDevice && matchPlatform;
  });

  let totalCodSum = 0;
  filtered.forEach(item => {
    let res = item.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
    const cod = res.codAmount || item.cod_amount || res.cod || 0;
    totalCodSum += Number(cod) || 0;
  });

  updateStats(filtered.length, totalCodSum);

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (mobileOrdersContainer) mobileOrdersContainer.innerHTML = '';
    desktopTableBody.innerHTML = '';
    if (pageInfo) pageInfo.textContent = 'Trang 1 / 1 • Tổng: 0 đơn';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  if (pageInfo) pageInfo.textContent = `Trang ${currentPage} / ${totalPages} • Tổng: ${filtered.length} đơn`;
  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = currentPage >= totalPages;

  desktopTableBody.innerHTML = pageItems.map(item => {
    let res = item.result || {};
    if (typeof res === 'string') {
      try { res = JSON.parse(res); } catch(e) {}
    }

    const name = item.customer_name || res.name || res.recipientName || res.hoTen || '—';
    const phone = item.phone || res.phone || res.recipientPhone || res.sdt || '';
    const address = item.address || res.normalizedAddress || res.address || res.diaChi || '—';
    
    let orderCode = item.order_code || res.orderCode || res.maDon || res.orderNo || res.ma_don || item.orderCode || '';
    if (!orderCode && (item.raw_text || item.note || res.extraNote || res.note)) {
      const textSearch = (item.raw_text || '') + ' ' + (item.note || '') + ' ' + (res.extraNote || '') + ' ' + (res.note || '');
      const m = textSearch.match(/Đơn hàng:\s*([A-Z0-9.\-_]+)/i) || textSearch.match(/Mã đơn:\s*([A-Z0-9.\-_]+)/i);
      if (m) orderCode = m[1];
    }
    if (!orderCode) orderCode = '—';
    
    let waybillCode = item.waybill_code || item.ma_van_don || res.waybillCode || res.maVanDon || res.trackingCode || res.waybill || res.trackingNo || item.tracking_code || '';
    if (!waybillCode && (item.raw_text || item.note || res.extraNote || res.note)) {
      const textSearch = (item.raw_text || '') + ' ' + (item.note || '') + ' ' + (res.extraNote || '') + ' ' + (res.note || '');
      const m = textSearch.match(/(?:số\s*hiệu\s*bưu\s*gửi|mã\s*vận\s*đơn|tracking)\s*[:;]?\s*([A-Z0-9]{8,20})/i);
      if (m) waybillCode = m[1];
    }
    if (!waybillCode || waybillCode.trim() === '') {
      waybillCode = '—';
    }

    const codAmount = res.codAmount || item.cod_amount || res.cod || 0;
    const collectFee = res.collectFee ? 'CÓ' : 'KHÔNG';
    const platform = res.platform || item.platform || 'vnpost';
    const device = item.device_name || item.deviceName || 'Yến';
    const timeStr = formatDateShort(item.created_at_short || item.created_at);

    return `
      <tr class="hover:bg-[#F9F9F8] transition-colors border-b border-[#EAEAEA] whitespace-nowrap">
        <td class="py-3.5 px-3 text-center"><input type="checkbox" class="order-checkbox rounded border-[#EAEAEA] cursor-pointer" data-id="${item.id}" onchange="handleCheckboxChange()"></td>
        <td class="py-3.5 px-3">
          <div class="font-bold text-[#111111] text-xs max-w-[200px] truncate" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
          <div class="text-[11px] text-[#787774] font-medium mt-0.5">${escapeHtml(phone)}</div>
        </td>
        <td class="py-3.5 px-3 max-w-[450px] truncate text-[#2F3437]" title="${escapeHtml(address)}">${escapeHtml(address)}</td>
        <td class="py-3.5 px-3">
          <span class="inline-block font-semibold text-xs text-[#111111] bg-[#F7F6F3] px-2 py-0.5 rounded border border-[#EAEAEA]">${escapeHtml(orderCode)}</span>
        </td>
        <td class="py-3.5 px-3">
          <div class="flex items-center gap-1.5">
            <span class="inline-block text-xs font-bold bg-pastel-blue px-2 py-0.5 rounded font-mono">${escapeHtml(waybillCode)}</span>
            ${waybillCode && waybillCode !== '—' ? `
              <button onclick="copyWaybillCode('${escapeHtml(waybillCode)}', '${escapeHtml(platform)}')" title="Sao chép mã vận đơn cho khách (${escapeHtml(waybillCode)} - ${platform.includes('jt') ? 'J&T' : 'VNPost'})" class="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded transition-all flex items-center gap-0.5 text-[10px] font-bold">
                <i class="ph ph-copy text-xs"></i>
                <span>Copy</span>
              </button>
            ` : ''}
          </div>
        </td>
        <td class="py-3.5 px-3 font-extrabold text-emerald-800 text-right">
          ${codAmount > 0 ? Number(codAmount).toLocaleString('vi-VN') + ' đ' : '0 đ'}
        </td>
        <td class="py-3.5 px-3 text-center text-[11px] font-medium text-[#787774]">${escapeHtml(collectFee)}</td>
        <td class="py-3.5 px-3 text-center">${getPlatformBadge(platform)}</td>
        <td class="py-3.5 px-3 text-center">
          <span class="inline-block text-[11px] font-medium bg-[#F7F6F3] text-[#787774] px-2 py-0.5 rounded border border-[#EAEAEA]">${escapeHtml(device)}</span>
        </td>
        <td class="py-3.5 px-3 text-center text-xs text-[#787774] font-medium">${escapeHtml(timeStr)}</td>
        <td class="py-3.5 px-3 text-center">
          <div class="flex items-center justify-center gap-1.5 text-[#787774]">
            <button onclick="copyOrderData('${item.id}', '${escapeHtml(name)}', '${escapeHtml(phone)}', '${escapeHtml(waybillCode)}', '${escapeHtml(address)}')" title="Sao chép thông tin" class="p-1.5 hover:text-[#111111] hover:bg-[#F0EFEA] rounded transition-all">
              <i class="ph ph-copy text-base"></i>
            </button>
            <button onclick="viewOrderDetails('${item.id}')" title="Xem & Sửa đơn hàng" class="p-1.5 hover:text-[#1F6C9F] hover:bg-pastel-blue rounded transition-all">
              <i class="ph ph-pencil-simple text-base"></i>
            </button>
            <button onclick="deleteOrder('${item.id}')" title="Xóa đơn hàng" class="p-1.5 hover:text-[#9F2F2D] hover:bg-pastel-rose rounded transition-all">
              <i class="ph ph-trash text-base"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (mobileOrdersContainer) {
    mobileOrdersContainer.innerHTML = pageItems.map(item => {
      let res = item.result || {};
      if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }

      const name = item.customer_name || res.name || res.recipientName || res.hoTen || '—';
      const phone = item.phone || res.phone || res.recipientPhone || res.sdt || '';
      const address = item.address || res.normalizedAddress || res.address || res.diaChi || '—';
      
      let orderCode = item.order_code || res.orderCode || res.maDon || res.orderNo || res.ma_don || item.orderCode || '';
      if (!orderCode && (item.raw_text || item.note || res.extraNote || res.note)) {
        const textSearch = (item.raw_text || '') + ' ' + (item.note || '') + ' ' + (res.extraNote || '') + ' ' + (res.note || '');
        const m = textSearch.match(/Đơn hàng:\s*([A-Z0-9.\-_]+)/i) || textSearch.match(/Mã đơn:\s*([A-Z0-9.\-_]+)/i);
        if (m) orderCode = m[1];
      }
      if (!orderCode) orderCode = '—';
      
      let waybillCode = item.waybill_code || item.ma_van_don || res.waybillCode || res.maVanDon || res.trackingCode || res.waybill || res.trackingNo || item.tracking_code || '';
      if (!waybillCode && (item.raw_text || item.note || res.extraNote || res.note)) {
        const textSearch = (item.raw_text || '') + ' ' + (item.note || '') + ' ' + (res.extraNote || '') + ' ' + (res.note || '');
        const m = textSearch.match(/(?:số\s*hiệu\s*bưu\s*gửi|mã\s*vận\s*đơn|tracking)\s*[:;]?\s*([A-Z0-9]{8,20})/i);
        if (m) waybillCode = m[1];
      }
      if (!waybillCode || waybillCode.trim() === '') {
        waybillCode = '—';
      }

      const codAmount = res.codAmount || item.cod_amount || res.cod || 0;
      const platform = res.platform || item.platform || 'vnpost';
      const device = item.device_name || item.deviceName || '—';
      const timeStr = formatDateShort(item.created_at_short || item.created_at);

      return `
        <div class="bg-white rounded-xl p-4 border border-[#EAEAEA] space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-[#111111] text-base">${escapeHtml(name)}</h4>
              <p class="text-xs text-[#787774] font-medium mt-0.5">${escapeHtml(phone)}</p>
            </div>
            ${getPlatformBadge(platform)}
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs bg-[#F9F9F8] p-3 rounded-lg border border-[#EAEAEA]">
            <div>
              <span class="text-[#787774] font-medium text-[11px]">Mã đơn:</span>
              <div class="font-bold text-[#111111] text-xs mt-0.5">${escapeHtml(orderCode)}</div>
            </div>
            <div>
              <span class="text-[#1F6C9F] font-medium text-[11px]">Mã vận đơn:</span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="font-bold text-[#1F6C9F] text-xs">${escapeHtml(waybillCode)}</span>
                ${waybillCode && waybillCode !== '—' ? `
                  <button onclick="copyWaybillCode('${escapeHtml(waybillCode)}', '${escapeHtml(platform)}')" title="Sao chép mã vận đơn" class="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-0.5 font-bold text-[10px]">
                    <i class="ph ph-copy text-xs"></i>
                    <span>Copy</span>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="text-xs text-[#2F3437] leading-relaxed bg-[#F7F6F3] p-2.5 rounded-lg border border-[#EAEAEA]">
            <span class="text-[#787774]">Địa chỉ:</span> ${escapeHtml(address)}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-[#EAEAEA] text-xs">
            <div>
              <span class="text-[#787774]">COD:</span>
              <span class="font-bold text-emerald-800 text-sm ml-1">${codAmount > 0 ? Number(codAmount).toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="copyOrderData('${item.id}', '${escapeHtml(name)}', '${escapeHtml(phone)}', '${escapeHtml(waybillCode)}', '${escapeHtml(address)}')" title="Sao chép" class="p-1 text-[#787774] hover:text-[#111111]">
                <i class="ph ph-copy text-base"></i>
              </button>
              <button onclick="viewOrderDetails('${item.id}')" title="Sửa" class="p-1 text-[#1F6C9F]">
                <i class="ph ph-pencil-simple text-base"></i>
              </button>
              <button onclick="deleteOrder('${item.id}')" title="Xóa" class="p-1 text-[#9F2F2D]">
                <i class="ph ph-trash text-base"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const selectAllCb = document.getElementById('select-all');
  if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.onchange = function() {
      const checkboxes = document.querySelectorAll('.order-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAllCb.checked);
      handleCheckboxChange();
    };
  }

  handleCheckboxChange();
  renderCharts(filtered);
}

// ==========================================
// 4. THAO TÁC HÀNG LOẠT (BULK SELECTION & DELETE)
// ==========================================
function handleCheckboxChange() {
  const selectedBoxes = document.querySelectorAll('.order-checkbox:checked');
  const bulkBar = document.getElementById('bulk-actions-bar');
  const selectedCountEl = document.getElementById('selected-count');

  if (selectedBoxes && selectedBoxes.length > 0) {
    if (bulkBar) bulkBar.classList.remove('hidden');
    if (selectedCountEl) selectedCountEl.textContent = selectedBoxes.length;
  } else {
    if (bulkBar) bulkBar.classList.add('hidden');
  }
}

// ─── XÓA ĐƠN HÀNG ĐƠN LẺ & HÀNG LOẠT ───
async function deleteOrder(id) {
  if (!id) return;
  const item = (allOrders || []).find(o => String(o.id) === String(id));
  const orderInfo = item ? `đơn hàng của "${item.customer_name || 'Khách hàng'}" (${item.phone || ''})` : `đơn hàng này`;

  if (!confirm(`⚠️ Bạn có chắc chắn muốn XÓA vĩnh viễn ${orderInfo} khỏi Supabase?`)) return;

  const sb = initSupabase();
  if (!sb) return alert("Lỗi kết nối Supabase!");

  try {
    const [histRes, subRes] = await Promise.all([
      sb.from('history').delete().eq('id', id),
      sb.from('submitted_orders').delete().or(`id.eq.${id},saved_order_id.eq.${id}`)
    ]);

    if (histRes.error && subRes.error) {
      alert("Lỗi khi xóa đơn hàng: " + (histRes.error.message || subRes.error.message));
    } else {
      if (typeof writeAuditLog === 'function') {
        writeAuditLog('Xóa đơn hàng', `Đã xóa vĩnh viễn ${orderInfo} khỏi hệ thống.`);
      }
      alert("🎉 Đã xóa thành công đơn hàng!");
      fetchOrders();
    }
  } catch(e) {
    alert("Lỗi hệ thống khi xóa đơn hàng: " + e.message);
  }
}

const btnBulkDelete = document.getElementById('btn-bulk-delete');
if (btnBulkDelete) {
  btnBulkDelete.addEventListener('click', async () => {
    const selectedBoxes = document.querySelectorAll('.order-checkbox:checked');
    const idsToDelete = Array.from(selectedBoxes).map(cb => cb.getAttribute('data-id'));

    if (idsToDelete.length === 0) return;

    if (!confirm(`⚠️ Bạn có chắc chắn muốn XÓA HÀNG LOẠT ${idsToDelete.length} đơn hàng đã chọn khỏi Supabase?`)) return;

    const sb = initSupabase();
    if (!sb) return alert("Lỗi kết nối Supabase!");

    try {
      await Promise.all([
        sb.from('history').delete().in('id', idsToDelete),
        sb.from('submitted_orders').delete().in('id', idsToDelete),
        sb.from('submitted_orders').delete().in('saved_order_id', idsToDelete)
      ]);

      if (typeof writeAuditLog === 'function') {
        writeAuditLog('Xóa hàng loạt', `Đã xóa vĩnh viễn ${idsToDelete.length} đơn hàng khỏi hệ thống.`);
      }
      alert(`🎉 Đã xóa thành công ${idsToDelete.length} đơn hàng!`);
      fetchOrders();
    } catch(e) {
      alert("Lỗi hệ thống: " + e.message);
    }
  });
}

// Modal Edit Elements
const editModal = document.getElementById('edit-order-modal');
const editForm = document.getElementById('edit-order-form');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

function viewOrderDetails(id) {
  const item = allOrders.find(o => String(o.id) === String(id));
  if (!item) return alert("Không tìm thấy đơn hàng!");

  let res = item.result || {};
  if (typeof res === 'string') {
    try { res = JSON.parse(res); } catch(e) {}
  }

  const waybill = item.waybill_code || item.tracking_code || item.ma_van_don || res.waybillCode || res.maVanDon || res.trackingCode || '';

  document.getElementById('edit-order-id').value = item.id;
  document.getElementById('edit-name').value = item.customer_name || res.name || res.recipientName || '';
  document.getElementById('edit-phone').value = item.phone || res.phone || res.recipientPhone || '';
  document.getElementById('edit-address').value = item.address || res.normalizedAddress || res.address || '';
  document.getElementById('edit-order-code').value = res.orderCode || item.order_code || res.maDon || '';
  document.getElementById('edit-waybill-code').value = waybill;
  document.getElementById('edit-cod-amount').value = res.codAmount || item.cod_amount || res.cod || 0;

  if (editModal) editModal.classList.remove('hidden');
}

function closeEditModal() {
  if (editModal) editModal.classList.add('hidden');
}

if (closeModalBtn) closeModalBtn.onclick = closeEditModal;
if (cancelModalBtn) cancelModalBtn.onclick = closeEditModal;

if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-order-id').value;
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const address = document.getElementById('edit-address').value;
    const orderCode = document.getElementById('edit-order-code').value;
    const waybillCode = document.getElementById('edit-waybill-code').value;
    const codAmount = Number(document.getElementById('edit-cod-amount').value) || 0;

    const originalItem = allOrders.find(o => String(o.id) === String(id));
    let res = originalItem?.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }

    res.name = name;
    res.recipientName = name;
    res.phone = phone;
    res.recipientPhone = phone;
    res.address = address;
    res.normalizedAddress = address;
    res.orderCode = orderCode;
    res.waybillCode = waybillCode;
    res.trackingCode = waybillCode;
    res.codAmount = codAmount;

    const sb = initSupabase();
    if (!sb) return alert("Lỗi kết nối Supabase!");

    try {
      const { error } = await sb
        .from('history')
        .update({
          result: res
        })
        .eq('id', id);

      // Cập nhật song song vào bảng submitted_orders nếu đơn hàng đã được lưu trên cloud
      const subUpdateObj = {
        name: name,
        phone: phone,
        address: address,
        order_code: orderCode,
        cod_amount: codAmount
      };
      if (waybillCode) {
        subUpdateObj.tracking_code = waybillCode;
        subUpdateObj.waybill_code = waybillCode;
      }
      await sb.from('submitted_orders').update(subUpdateObj).or(`id.eq.${id},saved_order_id.eq.${id}`).then(r => r, () => {});

      if (error) {
        alert("Lỗi khi lưu đơn hàng: " + error.message);
      } else {
        // Ghi nhận nhật ký audit log
        if (typeof writeAuditLog === 'function') {
          writeAuditLog('Sửa đơn hàng', `Đã cập nhật thông tin đơn hàng của khách hàng: ${name}, SĐT: ${phone}, Mã vận đơn: ${waybillCode}, COD: ${codAmount.toLocaleString('vi-VN')}đ`);
        }
        alert("🎉 Đã cập nhật thông tin đơn hàng thành công!");
        closeEditModal();
        fetchOrders();
      }
    } catch(err) {
      alert("Lỗi hệ thống: " + err.message);
    }
  });
}

function updateStats(total, totalCod) {
  if (statTotalOrders) statTotalOrders.textContent = `${total}/${total}`;
  if (statTotalCod) statTotalCod.textContent = `${Number(totalCod).toLocaleString('vi-VN')} đ`;
  
  const ordersStatic = document.getElementById('stat-total-orders-static');
  const codStatic = document.getElementById('stat-total-cod-static');
  if (ordersStatic) ordersStatic.textContent = total;
  if (codStatic) codStatic.textContent = `${Number(totalCod).toLocaleString('vi-VN')} đ`;
}

// Quick Date Handlers
const btnToday = document.getElementById('btn-today');
if (btnToday) {
  btnToday.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    if (dateFrom) dateFrom.value = today;
    if (dateTo) dateTo.value = today;
    renderOrders();
  });
}

const btn7Days = document.getElementById('btn-7days');
if (btn7Days) {
  btn7Days.addEventListener('click', () => {
    const d = new Date();
    if (dateTo) dateTo.value = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 7);
    if (dateFrom) dateFrom.value = d.toISOString().slice(0, 10);
    renderOrders();
  });
}

const btn30Days = document.getElementById('btn-30days');
if (btn30Days) {
  btn30Days.addEventListener('click', () => {
    const d = new Date();
    if (dateTo) dateTo.value = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 30);
    if (dateFrom) dateFrom.value = d.toISOString().slice(0, 10);
    renderOrders();
  });
}

const btnClearFilters = document.getElementById('btn-clear-filters');
if (btnClearFilters) {
  btnClearFilters.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (deviceFilter) deviceFilter.value = 'ALL';
    if (platformFilter) platformFilter.value = 'ALL';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    renderOrders();
  });
}

// Listeners
if (searchInput) searchInput.addEventListener('input', renderOrders);
if (deviceFilter) deviceFilter.addEventListener('change', renderOrders);
if (platformFilter) platformFilter.addEventListener('change', renderOrders);
if (dateFrom) dateFrom.addEventListener('change', renderOrders);
if (dateTo) dateTo.addEventListener('change', renderOrders);
if (refreshBtn) refreshBtn.addEventListener('click', fetchOrders);

if (perPageEl) {
  perPageEl.addEventListener('change', (e) => {
    perPage = Number(e.target.value);
    currentPage = 1;
    renderOrders();
  });
}

if (btnPrev) {
  btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderOrders();
    }
  });
}

if (btnNext) {
  btnNext.addEventListener('click', () => {
    const filteredCount = allOrders.filter(item => {
      let res = item.result || {};
      if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
      const name = (item.customer_name || res.name || res.recipientName || res.hoTen || '').toLowerCase();
      const phone = (item.phone || res.phone || res.recipientPhone || res.sdt || '').toLowerCase();
      const address = (item.address || res.address || res.normalizedAddress || res.diaChi || '').toLowerCase();
      const orderCode = (res.orderCode || item.order_code || res.maDon || '').toLowerCase();
      const waybillCode = (res.waybillCode || res.maVanDon || res.trackingCode || '').toLowerCase();
      const devName = (item.device_name || item.deviceName || '').toLowerCase();
      const platform = (res.platform || item.platform || '').toLowerCase();

      const createdAt = item.created_at || '';
      const dateStr = createdAt.slice(0, 10);
      const fromVal = dateFrom ? dateFrom.value : '';
      const toVal = dateTo ? dateTo.value : '';
      if (fromVal && dateStr < fromVal) return false;
      if (toVal && dateStr > toVal) return false;

      const matchKeyword = !searchInput.value.toLowerCase().trim() || 
        name.includes(searchInput.value.toLowerCase().trim()) || 
        phone.includes(searchInput.value.toLowerCase().trim()) || 
        orderCode.includes(searchInput.value.toLowerCase().trim()) ||
        waybillCode.includes(searchInput.value.toLowerCase().trim()) ||
        address.includes(searchInput.value.toLowerCase().trim());

      const matchDevice = deviceFilter.value === 'ALL' || devName === deviceFilter.value;
      const matchPlatform = platformFilter.value === 'ALL' || platform === platformFilter.value;

      return matchKeyword && matchDevice && matchPlatform;
    }).length;

    const totalPages = Math.max(1, Math.ceil(filteredCount / perPage));
    if (currentPage < totalPages) {
      currentPage++;
      renderOrders();
    }
  });
}

function getPlatformBadge(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('vnpost') || p.includes('bưu điện')) {
    return `<span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-[#FACC15] text-[#713F12] border border-[#EAB308] shadow-sm">VNPost</span>`;
  }
  if (p.includes('jt') || p.includes('j&t')) {
    return `<span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">J&T Express</span>`;
  }
  return `<span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F7F6F3] text-[#787774] border border-[#EAEAEA]">Khác</span>`;
}

// ─── SAO CHÉP MÃ VẬN ĐƠN KÈM ĐƠN VỊ VẬN CHUYỂN (DVVC) ───
function copyWaybillCode(waybillCode, platform) {
  if (!waybillCode || waybillCode === '—' || waybillCode === '-') {
    alert("Chưa có mã vận đơn để sao chép!");
    return;
  }
  const p = (platform || '').toLowerCase();
  const carrierName = (p.includes('jt') || p.includes('j&t')) ? 'J&T' : 'VNPost';
  const formattedText = `${waybillCode.trim()} - ${carrierName}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(formattedText).then(() => {
      if (typeof showToast === 'function') showToast(`📋 Đã sao chép: ${formattedText}`, 'success');
      else alert(`📋 Đã sao chép: ${formattedText}`);
    }).catch(() => fallbackCopyWaybillText(formattedText));
  } else {
    fallbackCopyWaybillText(formattedText);
  }
}

function fallbackCopyWaybillText(text) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    if (typeof showToast === 'function') showToast(`📋 Đã sao chép: ${text}`, 'success');
    else alert(`📋 Đã sao chép: ${text}`);
  } catch (e) {
    alert("Lỗi sao chép: " + text);
  }
  document.body.removeChild(input);
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  if (dateStr.length <= 16 && dateStr.includes(' ')) return dateStr;
  try {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch(e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Tải danh sách User (Chỉ Admin mới có quyền quản lý)
async function fetchUsers() {
  const sb = initSupabase();
  if (!sb) return;

  const container = document.getElementById('users-grid-container');
  if (container) container.innerHTML = `<div class="py-8 text-center text-xs text-[#787774] col-span-full">Đang tải danh sách tài khoản...</div>`;

  try {
    const { data, error } = await sb.from('profiles').select('*');
    if (error) {
      console.warn("Lỗi profiles, chuyển sang dùng danh sách dự phòng local:", error.message);
      let localUsers = localStorage.getItem('af_local_profiles');
      if (!localUsers) {
        allUsers = [{ id: 'admin_bypass_local', email: 'admin@luathuysinh.vn', role: 'admin' }];
        localStorage.setItem('af_local_profiles', JSON.stringify(allUsers));
      } else {
        allUsers = JSON.parse(localUsers);
      }
      renderUsers();
      loadSessionsAndLogs();
      return;
    }

    allUsers = data || [];
    renderUsers();
    loadSessionsAndLogs();
  } catch(err) {
    let localUsers = localStorage.getItem('af_local_profiles');
    allUsers = localUsers ? JSON.parse(localUsers) : [{ id: 'admin_bypass_local', email: 'admin@luathuysinh.vn', role: 'admin' }];
    renderUsers();
    loadSessionsAndLogs();
  }
}

function renderUsers() {
  const container = document.getElementById('users-grid-container');
  const countEl = document.getElementById('system-user-count');
  if (!container) return;

  if (countEl) countEl.textContent = allUsers.length;

  if (allUsers.length === 0) {
    container.innerHTML = `<div class="py-8 text-center text-xs text-[#787774] col-span-full">Không có tài khoản nào khác trong hệ thống.</div>`;
    return;
  }

  container.innerHTML = allUsers.map(u => {
    const isSelf = currentUser && currentUser.email === u.email;
    const roleBadge = u.role === 'admin' 
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Quản trị viên</span>`
      : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">Nhân viên</span>`;

    return `
      <div class="bg-white rounded-xl border border-brand-borderLight shadow-sm p-4 space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-full bg-brand-primaryBlue text-white flex items-center justify-center font-bold text-xs">
              ${u.email.charAt(0).toUpperCase()}
            </div>
            ${roleBadge}
          </div>
          <div>
            <h4 class="font-extrabold text-brand-darkText text-xs truncate" title="${escapeHtml(u.email)}">${escapeHtml(u.email)}</h4>
            <p class="text-[9px] text-brand-darkText/50 mt-0.5">ID: ${u.id.substring(0, 8)}...</p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-brand-borderLight">
          <button onclick="openUserModal('${u.id}')" class="px-2.5 py-1 rounded bg-brand-neutralBg text-brand-darkText hover:bg-brand-borderLight font-semibold text-[10px] transition-all">Sửa</button>
          ${isSelf ? '' : `<button onclick="deleteSystemUser('${u.id}', '${escapeHtml(u.email)}')" class="px-2.5 py-1 rounded bg-pastel-rose text-[#9F2F2D] hover:bg-rose-200 font-semibold text-[10px] transition-all">Xóa</button>`}
        </div>
      </div>
    `;
  }).join('');
}

// Giả lập Dữ liệu Phiên Đăng nhập & Audit Logs (Local Fallback + Supabase ready)
function loadSessionsAndLogs() {
  const sessionsContainer = document.getElementById('active-sessions-container');
  const logsContainer = document.getElementById('audit-logs-container');
  const sessionCountEl = document.getElementById('active-session-count');

  // 1. Tải danh sách Active Sessions
  let localSessions = localStorage.getItem('af_user_sessions');
  if (!localSessions) {
    localSessions = [
      { id: 'sess_1', email: 'admin@luathuysinh.vn', device: 'Windows 11 (Chrome Browser)', ip: '113.161.44.82', isCurrent: true, date: new Date().toISOString() },
      { id: 'sess_2', email: 'member@luathuysinh.vn', device: 'iPhone 15 (Zalo Webview)', ip: '14.232.88.109', isCurrent: false, date: new Date(Date.now() - 3600000).toISOString() }
    ];
    localStorage.setItem('af_user_sessions', JSON.stringify(localSessions));
  } else {
    localSessions = JSON.parse(localSessions);
  }

  if (sessionCountEl) {
    sessionCountEl.textContent = `${localSessions.length} Thiết bị`;
  }

  if (sessionsContainer) {
    sessionsContainer.innerHTML = localSessions.map(s => {
      return `
        <div class="p-3 bg-brand-neutralBg rounded-xl border border-brand-borderLight space-y-2 text-xs">
          <div class="flex items-start justify-between">
            <div>
              <span class="font-extrabold text-brand-darkText">${escapeHtml(s.email)}</span>
              <span class="text-[9px] text-[#787774] ml-1">(${s.ip})</span>
            </div>
            ${s.isCurrent 
              ? `<span class="px-1.5 py-0.5 text-[8px] bg-emerald-100 text-emerald-800 rounded font-bold">Thiết bị này</span>` 
              : `<button onclick="revokeSession('${s.id}')" class="text-[9px] text-red-600 hover:underline font-bold">Đăng xuất</button>`
            }
          </div>
          <div class="text-[10px] text-brand-darkText/70 flex items-center gap-1">
            <i class="ph ph-desktop text-sm"></i>
            <span>${escapeHtml(s.device)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Tải Nhật ký hoạt động Audit Logs
  let localLogs = localStorage.getItem('af_audit_logs');
  if (!localLogs) {
    localLogs = [
      { actor: 'admin@luathuysinh.vn', action: 'Đăng nhập', details: 'Đăng nhập hệ thống thành công', date: new Date().toISOString() },
      { actor: 'admin@luathuysinh.vn', action: 'Sửa COD', details: 'Đã sửa tiền thu hộ COD đơn của khách Nguyễn Văn A', date: new Date(Date.now() - 600000).toISOString() }
    ];
    localStorage.setItem('af_audit_logs', JSON.stringify(localLogs));
  } else {
    localLogs = JSON.parse(localLogs);
  }

  if (logsContainer) {
    if (localLogs.length === 0) {
      logsContainer.innerHTML = `<div class="text-center py-8 text-[11px] text-brand-darkText/50">Không có nhật ký hoạt động nào.</div>`;
    } else {
      logsContainer.innerHTML = localLogs.map(l => {
        const timeStr = new Date(l.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="flex gap-3 border-l-2 border-brand-mintLight pl-3 pb-2 relative">
            <div class="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-brand-primaryBlue"></div>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-brand-darkText">${escapeHtml(l.actor.split('@')[0])}</span>
                <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-brand-primaryBlueLight text-brand-primaryBlue">${escapeHtml(l.action)}</span>
                <span class="text-[9px] text-[#787774]">${timeStr}</span>
              </div>
              <p class="text-brand-darkText/70 text-[10px] leading-relaxed">${escapeHtml(l.details)}</p>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// Đăng xuất từ xa thiết bị
window.revokeSession = function(id) {
  if (!confirm("⚠️ Bạn có chắc chắn muốn đăng xuất từ xa cho thiết bị này không?")) return;

  let localSessions = JSON.parse(localStorage.getItem('af_user_sessions') || '[]');
  localSessions = localSessions.filter(s => s.id !== id);
  localStorage.setItem('af_user_sessions', JSON.stringify(localSessions));

  // Ghi nhận nhật ký audit log
  writeAuditLog('Đăng xuất từ xa', `Admin đã thu hồi token đăng xuất phiên thiết bị ID: ${id}`);
  loadSessionsAndLogs();
};

// Hàm ghi nhận nhật ký hệ thống
window.writeAuditLog = function(action, details) {
  let localLogs = JSON.parse(localStorage.getItem('af_audit_logs') || '[]');
  const storedUser = localStorage.getItem('af_logged_user');
  const email = storedUser ? JSON.parse(storedUser).email : 'Hệ thống';

  localLogs.unshift({
    actor: email,
    action: action,
    details: details,
    date: new Date().toISOString()
  });

  // Giới hạn tối đa 50 log gần nhất
  if (localLogs.length > 50) localLogs.pop();
  localStorage.setItem('af_audit_logs', JSON.stringify(localLogs));
};

// Sự kiện xóa log trên UI
document.getElementById('btn-clear-logs-ui')?.addEventListener('click', () => {
  if (confirm("⚠️ Bạn có chắc chắn muốn xóa sạch nhật ký hoạt động trên giao diện này không?")) {
    localStorage.setItem('af_audit_logs', JSON.stringify([]));
    loadSessionsAndLogs();
  }
});

// Modal Add/Edit User Logic
const userModal = document.getElementById('user-manage-modal');
const userForm = document.getElementById('user-manage-form');
const btnAddUser = document.getElementById('btn-add-user');
const closeUserModalBtn = document.getElementById('close-user-modal-btn');
const cancelUserModalBtn = document.getElementById('cancel-user-modal-btn');

if (btnAddUser) {
  btnAddUser.onclick = () => {
    document.getElementById('user-modal-title').textContent = "Thêm người dùng";
    document.getElementById('user-modal-id').value = "";
    document.getElementById('user-modal-email').value = "";
    document.getElementById('user-modal-email').disabled = false;
    document.getElementById('user-modal-password').value = "";
    document.getElementById('user-modal-password').required = true;
    document.getElementById('user-modal-role').value = "member";
    if (userModal) userModal.classList.remove('hidden');
  };
}

function openUserModal(id) {
  const u = allUsers.find(user => user.id === id);
  if (!u) return;

  document.getElementById('user-modal-title').textContent = "Chỉnh sửa tài khoản";
  document.getElementById('user-modal-id').value = u.id;
  document.getElementById('user-modal-email').value = u.email;
  document.getElementById('user-modal-email').disabled = true;
  document.getElementById('user-modal-password').value = "";
  document.getElementById('user-modal-password').required = false;
  document.getElementById('user-modal-role').value = u.role || 'member';

  if (userModal) userModal.classList.remove('hidden');
}

function closeUserModal() {
  if (userModal) userModal.classList.add('hidden');
}

if (closeUserModalBtn) closeUserModalBtn.onclick = closeUserModal;
if (cancelUserModalBtn) cancelUserModalBtn.onclick = closeUserModal;

if (userForm) {
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('user-modal-id').value;
    const email = document.getElementById('user-modal-email').value.trim();
    const password = document.getElementById('user-modal-password').value.trim();
    const role = document.getElementById('user-modal-role').value;

    const sb = initSupabase();
    if (!sb) return;

    try {
      if (!id) {
        const { data, error } = await sb.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { role: role }
          }
        });

        if (!error && data && data.user) {
          await sb.from('profiles').insert({
            id: data.user.id,
            email: email,
            role: role
          });
        }

        let localUsers = localStorage.getItem('af_local_profiles');
        let list = localUsers ? JSON.parse(localUsers) : [{ id: 'admin_bypass_local', email: 'admin@luathuysinh.vn', role: 'admin' }];
        const newId = data?.user?.id || 'local_' + Date.now();
        list.push({ id: newId, email: email, role: role });
        localStorage.setItem('af_local_profiles', JSON.stringify(list));

        writeAuditLog('Tạo tài khoản', `Đã tạo tài khoản nhân viên mới: ${email}`);
        alert(`🎉 Đã tạo thành công tài khoản: ${email}`);
      } else {
        await sb.from('profiles').update({ role: role }).eq('id', id);

        let localUsers = localStorage.getItem('af_local_profiles');
        if (localUsers) {
          let list = JSON.parse(localUsers);
          const uIdx = list.findIndex(user => user.id === id);
          if (uIdx !== -1) {
            list[uIdx].role = role;
            localStorage.setItem('af_local_profiles', JSON.stringify(list));
          }
        }

        writeAuditLog('Cập nhật quyền', `Đã sửa đổi thông tin quyền cho tài khoản: ${email}`);
        if (password) {
          alert("⚠️ Đã lưu thay đổi. Mật khẩu cần được tự đặt lại qua email khôi phục hoặc qua chức năng quản trị viên.");
        } else {
          alert("🎉 Đã cập nhật thành công thông tin người dùng!");
        }
      }

      closeUserModal();
      fetchUsers();
    } catch(err) {
      alert("Lỗi hệ thống: " + err.message);
    }
  });
}

async function deleteSystemUser(id, email) {
  if (!confirm(`⚠️ Bạn có chắc chắn muốn XÓA TÀI KHOẢN "${email}" khỏi hệ thống?`)) return;

  const sb = initSupabase();
  if (!sb) return;

  try {
    await sb.from('profiles').delete().eq('id', id);
    
    let localUsers = localStorage.getItem('af_local_profiles');
    if (localUsers) {
      let list = JSON.parse(localUsers);
      list = list.filter(user => user.id !== id);
      localStorage.setItem('af_local_profiles', JSON.stringify(list));
    }

    writeAuditLog('Xóa tài khoản', `Đã xóa vĩnh viễn tài khoản nhân viên: ${email}`);
    alert(`🎉 Đã xóa tài khoản "${email}" thành công!`);
    fetchUsers();
  } catch(e) {
    alert("Lỗi hệ thống: " + e.message);
  }
}

// ==========================================
// 6. BIỂU ĐỒ BÁO CÁO THỐNG KÊ (CHART.JS)
// ==========================================
let revenueChartInstance = null;
let ordersChartInstance = null;

function renderCharts(orders) {
  if (typeof Chart === 'undefined') return;

  const groupedData = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    groupedData[dateStr] = { revenue: 0, count: 0 };
  }

  orders.forEach(item => {
    let res = item.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
    const createdAt = item.created_at || '';
    const dateStr = createdAt.slice(0, 10);
    
    if (dateStr) {
      if (!groupedData[dateStr]) {
        groupedData[dateStr] = { revenue: 0, count: 0 };
      }
      const cod = Number(res.codAmount || item.cod_amount || res.cod || 0);
      groupedData[dateStr].revenue += cod;
      groupedData[dateStr].count += 1;
    }
  });

  const sortedDates = Object.keys(groupedData).sort();
  const labels = sortedDates.map(date => {
    const parts = date.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
  });
  const revenues = sortedDates.map(date => groupedData[date].revenue);
  const counts = sortedDates.map(date => groupedData[date].count);

  const ctxRev = document.getElementById('revenueChart');
  if (ctxRev) {
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctxRev, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu COD (VNĐ)',
          data: revenues,
          borderColor: '#3C7363', // Sage Green
          backgroundColor: 'rgba(60, 115, 99, 0.1)', // Light semi-transparent sage fill
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#3C7363',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#E5E7EB' },
            ticks: {
              callback: (value) => value.toLocaleString('vi-VN') + ' đ',
              font: { size: 10 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  const ctxOrd = document.getElementById('ordersCountChart');
  if (ctxOrd) {
    if (ordersChartInstance) ordersChartInstance.destroy();
    ordersChartInstance = new Chart(ctxOrd, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số lượng đơn hàng',
          data: counts,
          backgroundColor: '#3C7363', // Sage Green
          borderRadius: 6,
          barPercentage: 0.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#EAEAEA' },
            ticks: {
              stepSize: 1,
              font: { size: 10 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }
}

// ==========================================
// QUICK DATE HANDLERS CHO TAB THỐNG KÊ (STAT STATISTICS)
// ==========================================
const statDateFrom = document.getElementById('stat-date-from');
const statDateTo = document.getElementById('stat-date-to');
let activeStatFilter = null; // Theo dõi nút lọc đang được chọn ('today', '7days', '30days', 'month')

function handleStatDateChange() {
  if (!statDateFrom || !statDateTo) return;
  const fromVal = statDateFrom.value;
  const toVal = statDateTo.value;
  
  const filtered = allOrders.filter(item => {
    const createdAt = item.created_at || '';
    const dateStr = createdAt.slice(0, 10);
    if (fromVal && dateStr < fromVal) return false;
    if (toVal && dateStr > toVal) return false;
    return true;
  });
  renderCharts(filtered);
  
  let totalCodSum = 0;
  filtered.forEach(item => {
    let res = item.result || {};
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
    const cod = res.codAmount || item.cod_amount || res.cod || 0;
    totalCodSum += Number(cod) || 0;
  });
  const ordersStatic = document.getElementById('stat-total-orders-static');
  const codStatic = document.getElementById('stat-total-cod-static');
  if (ordersStatic) ordersStatic.textContent = filtered.length;
  if (codStatic) codStatic.textContent = `${Number(totalCodSum).toLocaleString('vi-VN')} đ`;
}

if (statDateFrom) statDateFrom.addEventListener('change', () => {
  activeStatFilter = null;
  setStatBtnActive(null);
  handleStatDateChange();
});
if (statDateTo) statDateTo.addEventListener('change', () => {
  activeStatFilter = null;
  setStatBtnActive(null);
  handleStatDateChange();
});

function setStatBtnActive(activeBtnId) {
  const btns = ['stat-btn-today', 'stat-btn-7days', 'stat-btn-30days', 'stat-btn-month'];
  btns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      if (id === activeBtnId) {
        // Nút được chọn sẽ đậm màu hơn hẳn (nền xanh Sage đậm, chữ trắng)
        btn.className = "px-3.5 py-1.5 rounded-lg border border-[#3C7363] bg-[#3C7363] text-white text-xs font-bold transition-all shadow-sm";
      } else {
        // Nút bình thường
        btn.className = "px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-brand-darkText hover:bg-brand-neutralBg hover:text-[#3C7363] transition-all";
      }
    }
  });
}

function clearStatDateFilters() {
  activeStatFilter = null;
  setStatBtnActive(null);
  if (statDateFrom) statDateFrom.value = '';
  if (statDateTo) statDateTo.value = '';
  handleStatDateChange();
}

const statBtnToday = document.getElementById('stat-btn-today');
if (statBtnToday) {
  statBtnToday.addEventListener('click', () => {
    if (activeStatFilter === 'today') {
      clearStatDateFilters();
    } else {
      activeStatFilter = 'today';
      setStatBtnActive('stat-btn-today');
      const today = new Date().toISOString().slice(0, 10);
      statDateFrom.value = today;
      statDateTo.value = today;
      handleStatDateChange();
    }
  });
}

const statBtn7Days = document.getElementById('stat-btn-7days');
if (statBtn7Days) {
  statBtn7Days.addEventListener('click', () => {
    if (activeStatFilter === '7days') {
      clearStatDateFilters();
    } else {
      activeStatFilter = '7days';
      setStatBtnActive('stat-btn-7days');
      const d = new Date();
      statDateTo.value = d.toISOString().slice(0, 10);
      d.setDate(d.getDate() - 7);
      statDateFrom.value = d.toISOString().slice(0, 10);
      handleStatDateChange();
    }
  });
}

const statBtn30Days = document.getElementById('stat-btn-30days');
if (statBtn30Days) {
  statBtn30Days.addEventListener('click', () => {
    if (activeStatFilter === '30days') {
      clearStatDateFilters();
    } else {
      activeStatFilter = '30days';
      setStatBtnActive('stat-btn-30days');
      const d = new Date();
      statDateTo.value = d.toISOString().slice(0, 10);
      d.setDate(d.getDate() - 30);
      statDateFrom.value = d.toISOString().slice(0, 10);
      handleStatDateChange();
    }
  });
}

const statBtnMonth = document.getElementById('stat-btn-month');
if (statBtnMonth) {
  statBtnMonth.addEventListener('click', () => {
    if (activeStatFilter === 'month') {
      clearStatDateFilters();
    } else {
      activeStatFilter = 'month';
      setStatBtnActive('stat-btn-month');
      const d = new Date();
      statDateTo.value = d.toISOString().slice(0, 10);
      d.setDate(1);
      statDateFrom.value = d.toISOString().slice(0, 10);
      handleStatDateChange();
    }
  });
}
