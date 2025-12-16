import { useState, useEffect } from 'react';
import { lazy, Suspense } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Swal from 'sweetalert2';

// Customer Components
import LoginScreen from './components/LoginScreen';
import ForgotPassword from './components/ForgotPassword';
import ErrorBoundary from './components/ErrorBoundary';
import SignUpScreen from './components/SignUpPage';
import HomePage from './components/HomePage';
import ProductListingPage from './components/ProductListingPage';
import ProductDetailPage from './components/ProductDetailPage';
import ShoppingCartPage from './components/ShoppingCartPage';
import CheckoutPage from './components/CheckoutPage';
import OrderConfirmationPage from './components/OrderConfirmationPage';
import TrackOrderPage from './components/TrackOrderPage';
import ARProductViewer from './components/ARProductViewerPage';
import TryOnStudio from './components/TryOnStudio';
import CustomerAccountSetting from './components/CustomerAccountSetting';

// Seller Components
const ManageInventory = lazy(() => import('./components/ManageInventory'));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const ListNewProductPage = lazy(() => import('./components/ListNewProductPage'));
const ViewAnalyticsPage = lazy(() => import('./components/ViewAnalyticsPage'));
const SellerAccountSetting = lazy(() => import('./components/SellerAccountSetting'));
const SellerOrders = lazy(() => import('./components/SellerOrders'));
const SellerOrderDetails = lazy(() => import('./components/SellerOrderDetails'));

// Admin Components
import AdminLogin from './components/AdminLogin';
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminUserManagement = lazy(() => import('./components/AdminUserManagement'));
const AdminOrdersManagement = lazy(() => import('./components/AdminOrdersManagement'));
const AdminSystemSettings = lazy(() => import('./components/AdminSystemSettings'));
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics'));
const AdminContentModeration = lazy(() => import('./components/AdminContentModeration'));
import AdminProductManagement from './components/AdminProductManagement';
 

import { cartApi, ordersApi, catalogApi, resolveAssetUrl } from './services/api';

const App = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('currentUser');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [authTokens, setAuthTokens] = useState(() => {
    try {
      const t = localStorage.getItem('authTokens');
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  });
  const [cartItems, setCartItems] = useState(() => {
    try {
      const c = localStorage.getItem('cartItems');
      return c ? JSON.parse(c) : [];
    } catch {
      return [];
    }
  });
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const u = localStorage.getItem('currentUser');
      const user = u ? JSON.parse(u) : null;
      if (user?.type === 'seller') return 'seller-dashboard';
      if (user?.type === 'admin') return 'admin-dashboard';
      return user ? 'home' : 'login';
    } catch {
      return 'login';
    }
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackedOrderId, setTrackedOrderId] = useState(null);
  const [vrProducts, setVrProducts] = useState(null);
 
  

  

 

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
      else localStorage.removeItem('currentUser');
      if (authTokens) localStorage.setItem('authTokens', JSON.stringify(authTokens));
      else localStorage.removeItem('authTokens');
      if (Array.isArray(cartItems)) localStorage.setItem('cartItems', JSON.stringify(cartItems));
      else localStorage.removeItem('cartItems');
    } catch { void 0; }
  }, [currentUser, authTokens, cartItems]);

  // LOGIN HANDLERS
  const handleLoginSuccess = (userType, payload = {}) => {
    const { user, tokens } = payload;
    const mergedUser = {
      username: user?.username || userType + '_user',
      email: user?.email || userType + '@stylesathi.com',
      type: user?.role || userType,
      name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || userType.toUpperCase(),
      ...user,
    };
    setCurrentUser(mergedUser);
    setAuthTokens(tokens || null);
    if (mergedUser.type === 'seller') setCurrentPage('seller-dashboard');
    else if (mergedUser.type === 'admin') setCurrentPage('admin-dashboard');
    else setCurrentPage('home');
    if (tokens) {
      cartApi.getCart(tokens.access).then((data) => {
        const items = (data.items || []).map((it) => ({
          id: it.product.id,
          name: it.product.title,
          price: Number(it.product.price),
          quantity: it.quantity,
          image: resolveAssetUrl(it.product.image_url || (Array.isArray(it.product.images) ? it.product.images[0] : '')),
          brand: it.product.brand,
          cartItemId: it.id,
        }));
        setCartItems(items);
      }).catch(() => {});
    }
  };

  const handleSignUpComplete = (payload) => {
    const { user, tokens } = payload || {};
    if (user) {
      const name = (user.name) || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username || 'Customer';
      const merged = { ...user, type: user.role || user.type || 'customer', name };
      setCurrentUser(merged);
    }
    if (tokens) setAuthTokens(tokens);
    setCurrentPage(((user?.role) || user?.type) === 'seller' ? 'seller-dashboard' : 'home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthTokens(null);
    setCartItems([]);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedProductId(null);
    setSelectedOrder(null);
    setCurrentPage('login');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authTokens');
    localStorage.removeItem('cartItems');
  };

  useEffect(() => {
    const goOrders = () => setCurrentPage('admin-orders-management');
    const goProducts = () => setCurrentPage('admin-product-management');
    window.addEventListener('admin:navigate:orders', goOrders);
    window.addEventListener('admin:navigate:products', goProducts);
    return () => {
      window.removeEventListener('admin:navigate:orders', goOrders);
      window.removeEventListener('admin:navigate:products', goProducts);
    };
  }, []);

  // ORDER HANDLER
  const handleConfirmOrder = async (orderData) => {
    try {
      const itemsPayload = cartItems
        .map((i) => {
          const pid = Number(i.id);
          return Number.isFinite(pid) ? { product_id: pid, quantity: i.quantity } : null;
        })
        .filter(Boolean);
      const resp = await ordersApi.createOrder(authTokens?.access, {
        items: itemsPayload,
        shipping: {
          fullName: orderData?.shippingAddress?.fullName || currentUser?.name,
          email: orderData?.shippingAddress?.email || currentUser?.email,
          phoneNumber: orderData?.shippingAddress?.phoneNumber || '',
          streetAddress: orderData?.shippingAddress?.streetAddress || '',
          city: orderData?.shippingAddress?.city || '',
          zipCode: orderData?.shippingAddress?.zipCode || '',
          country: orderData?.shippingAddress?.country || '',
        },
        payment_method: orderData?.paymentMethod || 'card',
      });
      setOrderDetails(resp);
      setCartItems([]);
      if (authTokens?.access) {
        try {
          const data = await cartApi.getCart(authTokens.access);
          const items = (data.items || []).map((it) => ({
            id: it.product.id,
            name: it.product.title,
            price: Number(it.product.price),
            quantity: it.quantity,
            image: resolveAssetUrl(it.product.image_url || (Array.isArray(it.product.images) ? it.product.images[0] : '')),
            brand: it.product.brand,
            cartItemId: it.id,
          }));
          setCartItems(items);
        } catch { /* noop */ }
      }
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'order-placed', title: 'Order Placed', message: `Order ${resp?.id || ''} placed successfully`, time: 'Just now' } }))
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'order-confirmed', title: 'Order Confirmed', message: `Order ${resp?.id || ''} confirmed`, time: 'Just now' } }))
      setCurrentPage('order-confirmation');
    } catch (e) {
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'error', title: 'Order Failed', message: e?.message || 'Unable to place order. Please try again.', time: 'Just now' } }))
    }
  };

  // CUSTOMER NAVIGATION
  const navigateToLogin = () => setCurrentPage('login');
  const navigateToSignUp = () => setCurrentPage('signup');
  const navigateToForgot = () => setCurrentPage('forgot-password');
  const navigateToHome = () => setCurrentPage('home');
 
  const navigateToProducts = (cat = null) => {
    setSelectedCategory(cat);
    setCurrentPage('products');
  };

  const navigateToProductDetail = (id, product = null) => {
    setSelectedProductId(id);
    if (product) setSelectedProduct(product);
    setCurrentPage('product-detail');
  };

  const navigateToCart = () => setCurrentPage('cart');
  const navigateToCheckout = () => setCurrentPage('checkout');
  const navigateToTrackOrder = (id = null) => {
    if (id) {
      setTrackedOrderId(id);
    } else if (orderDetails?.id) {
      setTrackedOrderId(orderDetails.id);
    }
    setCurrentPage('track-order');
  };
  
  const navigateToAR = async (product) => {
    setSelectedProduct(product || null);
    if (!product) {
      try {
        if (currentUser?.type === 'seller' && authTokens?.access) {
          const my = await catalogApi.getMyProducts(authTokens.access);
          const mapped = (my || []).map(p => ({
            id: p.id,
            title: p.title || p.name,
            price: Number(p.price),
            imageUrl: p.image_url || p.image,
            brand: p.brand,
            category: p.category,
            inStock: p.stock > 0,
            rating: p.rating || 4.5
          }));
          setVrProducts(mapped);
        } else {
          const all = await catalogApi.getProducts();
          const mapped = (all || []).map(p => ({
            id: p.id,
            title: p.title || p.name,
            price: Number(p.price),
            imageUrl: p.image_url || p.image,
            brand: p.brand,
            category: p.category,
            inStock: p.stock > 0,
            rating: p.rating || 4.5
          }));
          setVrProducts(mapped);
        }
      } catch {
        setVrProducts(null);
      }
    }
    setCurrentPage('ar-product-viewer');
  };

  const navigateToAIStudio = () => {
    setCurrentPage('tryon-studio');
  };

  const navigateToCustomerAccountSettings = () =>
    setCurrentPage('customer-account-settings');

  const handleProfileUpdated = (updated) => {
    setCurrentUser((prev) => ({ ...(prev || {}), ...(updated || {}) }));
  };

  const handleBecomeSeller = () => {
    const name = currentUser?.name || 'SELLER';
    setCurrentUser({ ...(currentUser || {}), type: 'seller', name });
    setCurrentPage('seller-dashboard');
  };

  // SELLER NAVIGATION
  const navigateToSellerDashboard = () => setCurrentPage('seller-dashboard');
  const navigateToSellerInventory = () => setCurrentPage('seller-inventory');
  const navigateToSellerListProduct = () => setCurrentPage('seller-list-product');
  const navigateToSellerAnalytics = () => setCurrentPage('seller-analytics');
  const navigateToSellerAccountSettings = () => setCurrentPage('seller-account-settings');
  const navigateToSellerOrders = () => setCurrentPage('seller-orders');
  
  const navigateToSellerOrderDetails = (orderOrId, productId = null) => {
    const isObj = orderOrId && typeof orderOrId === 'object';
    const buildAddressString = (addr) => {
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      const parts = [];
      if (addr.fullName) parts.push(addr.fullName);
      if (addr.streetAddress) parts.push(addr.streetAddress);
      if (addr.city) parts.push(addr.city);
      if (addr.zipCode) parts.push(addr.zipCode);
      if (addr.country) parts.push(addr.country);
      if (parts.length) return parts.join(', ');
      try { return JSON.stringify(addr); } catch { return ''; }
    };
    const order = isObj ? {
      ...orderOrId,
      id: String(orderOrId.id || ''),
      productId: productId ?? orderOrId.productId ?? null,
      date: orderOrId.date || new Date().toISOString(),
      status: orderOrId.status || 'processing',
      total: typeof orderOrId.total === 'number' ? orderOrId.total : (() => {
        const digits = String(orderOrId.id || '').replace(/\D/g, '');
        const num = digits ? parseInt(digits, 10) : 0;
        return (num % 900) + 100;
      })(),
      address: buildAddressString(orderOrId.address),
      shippingAddress: buildAddressString(orderOrId.shippingAddress),
      billingAddress: buildAddressString(orderOrId.billingAddress),
    } : {
      id: orderOrId,
      productId: productId,
      date: new Date().toISOString(),
      status: 'processing',
      total: (() => {
        const digits = (orderOrId || '').toString().replace(/\D/g, '');
        const num = digits ? parseInt(digits, 10) : 0;
        return (num % 900) + 100;
      })()
    };
    setSelectedOrder(order);
    setCurrentPage('seller-order-details');
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const toBackend = (s) => (s === 'shipped' ? 'in_transit' : (s === 'pending' ? 'confirmed' : s));
    const backendStatus = toBackend(newStatus);
    if (authTokens?.access) {
      await ordersApi.updateSellerOrderStatus(authTokens.access, String(orderId).replace(/\D/g, '') || orderId, backendStatus).catch(() => null);
    }
    setSelectedOrder((prev) => ({ ...(prev || {}), status: newStatus }));
    const evt = new CustomEvent('sellerOrderStatusUpdated', { detail: { orderId, status: newStatus } });
    window.dispatchEvent(evt);
    const titles = {
      pending: 'Order Pending',
      processing: 'Order Processing',
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled'
    };
    const title = titles[newStatus] || 'Order Updated';
    window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: `order-${newStatus}`, title, message: `Order ${orderId} ${newStatus}`, time: 'Just now' } }))
  };

  // ADMIN NAVIGATION
  const navigateToAdminLogin = () => setCurrentPage('admin-login');
  const navigateToAdminUserManagement = () => setCurrentPage('admin-user-management');
  const navigateToAdminOrdersManagement = () => setCurrentPage('admin-orders-management');
  const navigateToAdminSystemSettings = () => setCurrentPage('admin-system-settings');
  const navigateToAdminAnalytics = () => setCurrentPage('admin-analytics');
  const navigateToAdminContentModeration = () => setCurrentPage('admin-content-moderation');
  const handleAdminBack = () => setCurrentPage('admin-dashboard');

  // SELLER DASHBOARD SPECIFIC NAVIGATION
  const handleSellerSearch = (query) => {
    // You can implement search logic here or navigate to search results
    console.log('Searching for:', query);
    // For now, just show an alert
    Swal.fire({ icon: 'info', title: 'Search', text: `Searching for: ${query}` });
  };

  const handleNavigateToOrderDetails = (orderId, productId) => {
    navigateToSellerOrderDetails(orderId, productId);
  };

  const handleNavigateToAnalytics = (productId) => {
    // Set the selected product for analytics if needed
    if (productId) {
      setSelectedProductId(productId);
    }
    navigateToSellerAnalytics();
  };

  // CART HANDLER
  const handleAddToCart = async (product, qty = 1) => {
    const localItem = {
      id: product.id,
      name: product.title || product.name,
      price: typeof product.price === 'string' ? parseFloat(product.price.replace('$', '')) : Number(product.price),
      quantity: qty,
      image: product.image_url || product.imageUrl,
      brand: product.brand,
    };
    const existing = cartItems.find((i) => i.id === product.id);
    if (existing) {
      setCartItems(cartItems.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + qty } : i)));
    } else {
      setCartItems([...cartItems, localItem]);
    }
    const numericId = Number(product.id);
    if (authTokens?.access && Number.isFinite(numericId)) {
      const added = await cartApi.addItem(authTokens.access, { product_id: numericId, quantity: qty }).catch(() => null);
      if (added) {
        setCartItems((prev) => prev.map((i) => (i.id === product.id ? { ...i, cartItemId: added.id } : i)));
      }
    }
  };

  const handleUpdateCart = async (updatedItems) => {
    const prevItems = cartItems;
    const sanitized = updatedItems.filter((item) => item.quantity > 0);
    setCartItems(sanitized);
    if (authTokens?.access) {
      const updatedMap = new Map(sanitized.map((i) => [i.id, i]));
      for (const prev of prevItems) {
        const curr = updatedMap.get(prev.id);
        const removed = !curr;
        const zeroed = curr && curr.quantity <= 0;
        if ((removed || zeroed) && prev.cartItemId) {
          await cartApi.removeItem(authTokens.access, prev.cartItemId).catch(() => null);
        }
      }
      for (const item of sanitized) {
        if (item.cartItemId) {
          await cartApi.updateItem(authTokens.access, item.cartItemId, { quantity: item.quantity }).catch(() => null);
        }
      }
    }
  };

  // PAGE RENDERING
  const renderCurrentPage = () => {
    // ADMIN PAGES
    if (currentUser?.type === 'admin' && currentPage.startsWith('admin-')) {
      switch (currentPage) {
        case 'admin-dashboard':
          return (
            <AdminDashboard
              onUserManagement={navigateToAdminUserManagement}
              onOrdersManagement={navigateToAdminOrdersManagement}
              onContentModeration={navigateToAdminContentModeration}
              onSystemSettings={navigateToAdminSystemSettings}
              onReports={navigateToAdminAnalytics}
              onLogout={handleLogout}
              currentUser={currentUser}
              token={authTokens?.access}
            />
          );
        case 'admin-user-management':
          return (
            <AdminUserManagement onBack={handleAdminBack} currentUser={currentUser} token={authTokens?.access} />
          );
        case 'admin-orders-management':
          return (
            <AdminOrdersManagement onBack={handleAdminBack} token={authTokens?.access} />
          );
        case 'admin-product-management':
          return (
            <AdminProductManagement onBack={handleAdminBack} token={authTokens?.access} />
          );
        case 'admin-system-settings':
          return (
            <AdminSystemSettings onBack={handleAdminBack} currentUser={currentUser} />
          );
        case 'admin-analytics':
          return <AdminAnalytics onBack={handleAdminBack} currentUser={currentUser} token={authTokens?.access} />;
        case 'admin-content-moderation':
          return <AdminContentModeration onBack={handleAdminBack} onLogout={handleLogout} currentUser={currentUser} token={authTokens?.access} />;
        default:
          return <AdminDashboard />;
      }
    }

    // SELLER PAGES
    if (currentUser?.type === 'seller' && currentPage.startsWith('seller-')) {
      switch (currentPage) {
        case 'seller-dashboard':
          return (
            <SellerDashboard
              token={authTokens?.access}
              onAddProduct={navigateToSellerListProduct}
              onManageInventory={navigateToSellerInventory}
              onViewAnalytics={navigateToSellerAnalytics}
              onViewOrders={navigateToSellerOrders}
              onProfileClick={navigateToSellerAccountSettings}
              onLogout={handleLogout}
              currentUser={currentUser}
              // New navigation props
              onNavigateToOrderDetails={handleNavigateToOrderDetails}
              onNavigateToAnalytics={handleNavigateToAnalytics}
              onSearch={handleSellerSearch}
              onLogoClick={navigateToSellerDashboard}
              onVerifiedSellerClick={navigateToSellerAccountSettings}
            />
          );
        case 'seller-inventory':
          return (
            <ManageInventory
              token={authTokens?.access}
              onBack={navigateToSellerDashboard}
              onLogoClick={navigateToSellerDashboard}
              onProfileClick={navigateToSellerAccountSettings}
              onLogout={handleLogout}
              currentUser={currentUser}
              onAddProduct={navigateToSellerListProduct}
            />
          );
        case 'seller-list-product':
          return (
            <ListNewProductPage
              token={authTokens?.access}
              onBack={navigateToSellerDashboard}
              onLogoClick={navigateToSellerDashboard}
              onProfileClick={navigateToSellerAccountSettings}
              onLogout={handleLogout}
              currentUser={currentUser}
              onManageInventory={navigateToSellerInventory}
            />
          );
        case 'seller-analytics':
          return (
            <ViewAnalyticsPage
              onBack={navigateToSellerDashboard}
              onLogoClick={navigateToSellerDashboard}
              onProfileClick={navigateToSellerAccountSettings}
              onLogout={handleLogout}
              currentUser={currentUser}
              productId={selectedProductId}
              token={authTokens?.access}
            />
          );
      case 'seller-account-settings':
        return (
          <SellerAccountSetting
            onBack={navigateToSellerDashboard}
            currentUser={currentUser}
            token={authTokens?.access}
            onUpdateUser={handleProfileUpdated}
          />
        );
        case 'seller-orders':
          return (
            <SellerOrders
              onBack={navigateToSellerDashboard}
              onViewOrderDetails={navigateToSellerOrderDetails}
              token={authTokens?.access}
              currentUser={currentUser}
            />
          );
        case 'seller-order-details':
          return (
            <SellerOrderDetails
              order={selectedOrder}
              onBack={navigateToSellerOrders}
              onUpdateStatus={handleUpdateOrderStatus}
              token={authTokens?.access}
              currentUser={currentUser}
            />
          );
        default:
          return (
            <SellerDashboard
              token={authTokens?.access}
              onAddProduct={navigateToSellerListProduct}
              onManageInventory={navigateToSellerInventory}
              onViewAnalytics={navigateToSellerAnalytics}
              onViewOrders={navigateToSellerOrders}
              onProfileClick={navigateToSellerAccountSettings}
              onLogout={handleLogout}
              currentUser={currentUser}
              onNavigateToOrderDetails={handleNavigateToOrderDetails}
              onNavigateToAnalytics={handleNavigateToAnalytics}
              onSearch={handleSellerSearch}
              onLogoClick={navigateToSellerDashboard}
              onVerifiedSellerClick={navigateToSellerAccountSettings}
            />
          );
      }
    }

    // CUSTOMER & AUTH PAGES
    switch (currentPage) {
      case 'login':
        return (
          <LoginScreen
            onNavigateToSignUp={navigateToSignUp}
            onNavigateToForgot={navigateToForgot}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToAdminLogin={navigateToAdminLogin}
          />
        );
      case 'admin-login':
        return (
          <AdminLogin
            onNavigateToUserLogin={navigateToLogin}
            onNavigateToForgot={navigateToForgot}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onNavigateBack={navigateToLogin}
            onNavigateToLogin={navigateToLogin}
          />
        );
      case 'signup':
        return (
          <SignUpScreen
            onNavigateToLogin={navigateToLogin}
            onSignUpComplete={handleSignUpComplete}
            isSellerSignUp={false}
          />
        );
      case 'seller-signup':
        return (
          <SignUpScreen
            onNavigateToLogin={navigateToLogin}
            onSignUpComplete={handleSignUpComplete}
            isSellerSignUp={true}
          />
        );
      case 'home':
        return (
          <HomePage
            onNavigateToProducts={navigateToProducts}
            onNavigateToCart={navigateToCart}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onNavigateToProductDetail={navigateToProductDetail}
            onNavigateToAR={navigateToAR}
            onNavigateToAIStudio={navigateToAIStudio}
            onAddToCart={handleAddToCart}
            onLogout={handleLogout}
            currentUser={currentUser}
            cartItemsCount={cartItems.length}
            onBecomeSeller={handleBecomeSeller}
            onNavigateToTrackOrder={navigateToTrackOrder}
            hasOrder={!!orderDetails}
          />
        );
      case 'products':
        return (
          <ProductListingPage
            category={selectedCategory}
            onNavigateToProductDetail={navigateToProductDetail}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout}
            onNavigateToCart={navigateToCart}
            onAddToCart={handleAddToCart}
            onNavigateBack={navigateToHome}
            onNavigateToAR={navigateToAR}
            currentUser={currentUser}
          />
        );
      case 'product-detail':
        return (
          <ProductDetailPage
            productId={selectedProductId}
            product={selectedProduct}
            currentUser={currentUser}
            onNavigateBack={() => navigateToProducts(selectedCategory)}
            onNavigateToCart={navigateToCart}
            onNavigateToCheckout={navigateToCheckout}
            onAddToCart={handleAddToCart}
            onNavigateToAR={navigateToAR}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout}
            cartItemsCount={cartItems.length}
          />
        );
      case 'cart':
        return (
          <ShoppingCartPage
            cartItems={cartItems}
            onNavigateBack={navigateToHome}
            onNavigateToCheckout={navigateToCheckout}
            onUpdateCart={handleUpdateCart}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        );
      case 'checkout':
        return (
          <CheckoutPage
            cartItems={cartItems}
            onNavigateToCart={navigateToCart}
            onConfirmOrder={handleConfirmOrder}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        );
      case 'order-confirmation':
        return (
          <OrderConfirmationPage
            order={orderDetails}
            onNavigateToHome={navigateToHome}
            onNavigateToShop={() => navigateToProducts(null)}
            onNavigateToTrackOrder={navigateToTrackOrder}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout}
            currentUser={currentUser}
            cartItemsCount={cartItems.length}
          />
        );
      case 'track-order':
        return (
          <TrackOrderPage 
            orderId={trackedOrderId || orderDetails?.id || null}
            onNavigateBack={navigateToHome} 
            onNavigateToShop={() => navigateToProducts(null)}
            onNavigateToCart={navigateToCart} 
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout} 
            currentUser={currentUser}
            token={authTokens?.access}
            cartItemsCount={cartItems.length}
            initialOrder={orderDetails}
          />
        );
      case 'ar-product-viewer':
        return (
          <ARProductViewer
            product={selectedProduct}
            onClose={() =>
              selectedProductId
                ? navigateToProductDetail(selectedProductId)
                : navigateToHome()
            }
            onAddToCart={handleAddToCart}
            productsData={vrProducts || undefined}
            cartItems={cartItems}
            onNavigateToProducts={navigateToProducts}
            onNavigateToHome={navigateToHome}
            onNavigateToCart={navigateToCart}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        );
      case 'tryon-studio':
        return (
          <TryOnStudio
            onBack={navigateToHome}
            currentUser={currentUser}
            onNavigateToCart={navigateToCart}
            onNavigateToAccountSettings={navigateToCustomerAccountSettings}
            cartItemsCount={cartItems.length}
            onNavigateToProductDetail={navigateToProductDetail}
          />
        );
      case 'customer-account-settings':
        return (
          <CustomerAccountSetting
            onBack={navigateToHome}
            currentUser={currentUser}
            onLogout={handleLogout}
            token={authTokens?.access}
            onUpdateUser={handleProfileUpdated}
          />
        );
      default:
        return (
          <LoginScreen
            onNavigateToSignUp={navigateToSignUp}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToAdminLogin={navigateToAdminLogin}
          />
        );
    }
  };

  return <div className="App"><ErrorBoundary><Suspense fallback={<div className="p-4 text-center text-muted">Loading…</div>}>{renderCurrentPage()}</Suspense></ErrorBoundary></div>;
};

export default App;
