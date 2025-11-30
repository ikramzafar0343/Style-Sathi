import { useState, useEffect } from 'react';
import { 
  FaArrowLeft, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaSearch, 
  FaUser,
  FaShieldAlt,
  FaShoppingBag,
  FaFilter,
  FaFileAlt,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaCalendar,
  FaUserCheck,
  FaUserTimes,
  FaInfoCircle
} from 'react-icons/fa';

// Mockup data (unused, kept for reference)
const USER_MANAGEMENT_DATA = {
  pendingUsers: [
    {
      id: 'USER-001',
      fullName: 'John Fashion Seller',
      email: 'john.seller@stylesathi.com',
      username: 'johnseller',
      phone: '+1-555-0123',
      role: 'seller',
      registrationDate: '2024-03-15',
      status: 'pending',
      businessName: 'Fashion Hub Store',
      businessAddress: '123 Business Street, City, State 12345',
      taxId: 'TAX-123456789',
      verificationDocuments: [
        {
          type: 'Business License',
          url: 'https://via.placeholder.com/300?text=Business+License'
        },
        {
          type: 'Tax Certificate',
          url: 'https://via.placeholder.com/300?text=Tax+Certificate'
        }
      ],
      notes: 'New seller with complete documentation. Business appears legitimate.'
    },
    {
      id: 'USER-002',
      fullName: 'Alice Customer',
      email: 'alice.customer@stylesathi.com',
      username: 'alicecustomer',
      phone: '+1-555-0124',
      role: 'customer',
      registrationDate: '2024-03-18',
      status: 'pending',
      notes: 'Standard customer registration'
    },
    {
      id: 'USER-003',
      fullName: 'Bob Retailer',
      email: 'bob.retailer@stylesathi.com',
      username: 'bobretailer',
      phone: '+1-555-0125',
      role: 'seller',
      registrationDate: '2024-03-20',
      status: 'pending',
      businessName: 'Bob Fashion Outlet',
      businessAddress: '456 Retail Avenue, City, State 12345',
      taxId: 'TAX-987654321',
      verificationDocuments: [
        {
          type: 'Business Registration',
          url: 'https://via.placeholder.com/300?text=Business+Registration'
        }
      ]
    }
  ],
  approvedUsers: [
    {
      id: 'USER-004',
      fullName: 'Sarah Approved Seller',
      email: 'sarah.seller@stylesathi.com',
      username: 'sarahseller',
      phone: '+1-555-0126',
      role: 'seller',
      registrationDate: '2024-03-10',
      status: 'approved',
      approvedDate: '2024-03-12',
      approvedBy: 'Admin User',
      businessName: 'Sarah Fashion Store'
    },
    {
      id: 'USER-005',
      fullName: 'Mike Customer',
      email: 'mike.customer@stylesathi.com',
      username: 'mikecustomer',
      phone: '+1-555-0127',
      role: 'customer',
      registrationDate: '2024-03-11',
      status: 'approved',
      approvedDate: '2024-03-11',
      approvedBy: 'Admin User'
    }
  ],
  rejectedUsers: [
    {
      id: 'USER-006',
      fullName: 'Tom Rejected Seller',
      email: 'tom.seller@stylesathi.com',
      username: 'tomseller',
      phone: '+1-555-0128',
      role: 'seller',
      registrationDate: '2024-03-05',
      status: 'rejected',
      rejectedDate: '2024-03-07',
      rejectedBy: 'Admin User',
      rejectionReason: 'Incomplete business documentation'
    }
  ]
};

import { adminApi } from '../services/api';
import NotificationBell from './NotificationBell';

 

const AdminUserManagement = ({ onBack, currentUser, token }) => {
  const secondaryColor = '#2c67c4';
  
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [users, setUsers] = useState({
    pending: [],
    approved: [],
    rejected: []
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await adminApi.getUsers(token);
        if (mounted) {
          setUsers({ pending: [], approved: resp.users || [], rejected: [] });
        }
      } catch (e) {
        console.error('Failed to load admin users', e);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const handleApprove = (userId) => {
    const user = users.pending.find(u => u.id === userId);
    if (user) {
      const updatedUser = {
        ...user,
        status: 'approved',
        approvedDate: new Date().toISOString().split('T')[0],
        approvedBy: currentUser?.name || 'Admin User',
        approvalNotes: approvalNotes
      };
      
      setUsers(prev => ({
        ...prev,
        pending: prev.pending.filter(u => u.id !== userId),
        approved: [...prev.approved, updatedUser]
      }));
      
      setSelectedUser(null);
      setApprovalNotes('');
      setShowSuccessMessage({ message: `User ${user.fullName} has been approved successfully!` });
      
      setTimeout(() => {
        setShowSuccessMessage(null);
      }, 3000);
    }
  };

  const handleRejectClick = (userId, userName) => {
    setShowRejectConfirm({ userId, userName });
    setRejectionReason('');
  };

  const confirmReject = () => {
    if (showRejectConfirm) {
      const user = users.pending.find(u => u.id === showRejectConfirm.userId);
      if (user) {
        const updatedUser = {
          ...user,
          status: 'rejected',
          rejectedDate: new Date().toISOString().split('T')[0],
          rejectedBy: currentUser?.name || 'Admin User',
          rejectionReason: rejectionReason || 'User does not meet approval requirements.'
        };
        
        setUsers(prev => ({
          ...prev,
          pending: prev.pending.filter(u => u.id !== showRejectConfirm.userId),
          rejected: [...prev.rejected, updatedUser]
        }));
        
        setSelectedUser(null);
        setApprovalNotes('');
        setShowSuccessMessage({ message: `User ${showRejectConfirm.userName} has been rejected.` });
        setShowRejectConfirm(null);
        setRejectionReason('');
        
        setTimeout(() => {
          setShowSuccessMessage(null);
        }, 3000);
      }
    }
  };

  const cancelReject = () => {
    setShowRejectConfirm(null);
    setRejectionReason('');
  };

  const handleDeleteClick = (userId, userName) => {
    setShowDeleteConfirm({ userId, userName });
    setDeleteReason('');
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    if (!deleteReason.trim()) {
      alert('Deletion reason is required');
      return;
    }
    const userId = showDeleteConfirm.userId;
    setDeletingId(userId);
    try {
      await adminApi.deleteUser(token, { id: userId, reason: deleteReason });
      setUsers((prev) => ({
        pending: prev.pending.filter((u) => u.id !== userId),
        approved: prev.approved.filter((u) => u.id !== userId),
        rejected: prev.rejected.filter((u) => u.id !== userId),
      }));
      if (selectedUser?.id === userId) setSelectedUser(null);
      window.dispatchEvent(new CustomEvent('notification:push', {
        detail: { type: 'user-delete', title: 'User Deleted', message: `${showDeleteConfirm.userName} removed`, time: 'Just now' }
      }));
      setShowSuccessMessage({ message: `User ${showDeleteConfirm.userName} has been deleted.` });
      setShowDeleteConfirm(null);
      setDeleteReason('');
      setTimeout(() => setShowSuccessMessage(null), 3000);
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
    setDeletingId(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
    setDeleteReason('');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge bg-warning text-dark',
      approved: 'badge bg-success',
      rejected: 'badge bg-danger'
    };
    return badges[status] || 'badge bg-secondary';
  };

  const getStatusIcon = (status) => {
    if (status === 'approved') return <FaCheckCircle className="me-1" />;
    if (status === 'rejected') return <FaTimesCircle className="me-1" />;
    return <FaClock className="me-1" />;
  };

  const getRoleBadge = (role) => {
    return role === 'seller' 
      ? 'badge bg-primary' 
      : 'badge bg-info text-dark';
  };

  const getRoleIcon = (role) => {
    return role === 'seller' 
      ? <FaShoppingBag className="me-1" /> 
      : <FaUser className="me-1" />;
  };

  const filteredUsers = () => {
    let filtered = users[selectedTab] || [];
    
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    return filtered;
  };

  const displayUsers = filteredUsers();
  const pendingCount = users.pending.length;
  const approvedCount = users.approved.length;
  const rejectedCount = users.rejected.length;

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="bg-white border-bottom sticky-top">
        <div className="container-fluid">
          <div className="row align-items-center py-3">
            <div className="col">
              <div className="d-flex align-items-center">
                <button
                  onClick={onBack}
                  className="btn btn-light me-3"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="h3 mb-1 fw-bold" style={{ color: secondaryColor }}>User Management</h1>
                  <p className="text-muted mb-0">Manage and approve users (sellers and customers)</p>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <NotificationBell mainColor={secondaryColor} secondaryColor={secondaryColor} />
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4">
        <div className="row">
          {/* Main Content */}
          <div className={`${selectedUser && selectedTab === 'pending' ? 'col-md-6' : 'col-12'}`}>
            {/* Tabs */}
            <div className="card mb-4">
              <div className="card-header bg-white">
                <ul className="nav nav-tabs card-header-tabs">
                  {[
                    { id: 'pending', label: 'Pending', count: pendingCount, icon: FaClock },
                    { id: 'approved', label: 'Approved', count: approvedCount, icon: FaCheckCircle },
                    { id: 'rejected', label: 'Rejected', count: rejectedCount, icon: FaTimesCircle }
                  ].map((tab) => (
                    <li key={tab.id} className="nav-item">
                      <button
                        onClick={() => {
                          setSelectedTab(tab.id);
                          setSelectedUser(null);
                        }}
                        className={`nav-link ${selectedTab === tab.id ? 'active' : ''}`}
                        style={selectedTab === tab.id ? { color: secondaryColor, borderBottom: `2px solid ${secondaryColor}` } : {}}
                      >
                        <tab.icon className="me-2" />
                        {tab.label}
                        <span className="badge bg-secondary ms-2">{tab.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-body">
                {/* Filters and Search */}
                <div className="row mb-4">
                  <div className="col-md-8">
                    <div className="input-group">
                      <span className="input-group-text" style={{ borderColor: secondaryColor }}>
                        <FaSearch style={{ color: secondaryColor }} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search users by name, email, username, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-control"
                        style={{ borderColor: secondaryColor }}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text" style={{ borderColor: secondaryColor }}>
                        <FaFilter style={{ color: secondaryColor }} />
                      </span>
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="form-select"
                        style={{ borderColor: secondaryColor }}
                      >
                        <option value="all">All Roles</option>
                        <option value="seller">Sellers</option>
                        <option value="customer">Customers</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Users List */}
                <div className="row">
                  {displayUsers.length === 0 ? (
                    <div className="col-12 text-center py-5">
                      <FaUserTimes className="text-muted mb-3" size={48} />
                      <p className="text-muted">No users found</p>
                    </div>
                  ) : (
                    displayUsers.map((user) => (
                      <div key={user.id} className="col-12 mb-3">
                        <div 
                          className="card cursor-pointer hover-shadow"
                          onClick={() => setSelectedUser(user)}
                        >
                          <div className="card-body">
                            <div className="row align-items-center">
                              <div className="col-auto">
                                <div 
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                  style={{ width: '60px', height: '60px', fontSize: '1.5rem', backgroundColor: secondaryColor }}
                                >
                                  {user.fullName.charAt(0)}
                                </div>
                              </div>
                              <div className="col">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <h5 className="card-title mb-1">
                                      {user.fullName}
                                      <span className={`ms-2 ${getRoleBadge(user.role)}`}>
                                        {getRoleIcon(user.role)}
                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                      </span>
                                    </h5>
                                    <p className="text-muted mb-2">{user.email}</p>
                                  </div>
                                  <span className={getStatusBadge(user.status)}>
                                    {getStatusIcon(user.status)}
                                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                  </span>
                                </div>
                                <div className="row">
                                  <div className="col-md-3">
                                    <small className="text-muted">
                                      <FaPhone className="me-1" />
                                      {user.phone}
                                    </small>
                                  </div>
                                  <div className="col-md-3">
                                    <small className="text-muted">
                                      <FaCalendar className="me-1" />
                                      {user.registrationDate}
                                    </small>
                                  </div>
                                  {user.businessName && (
                                    <div className="col-md-4">
                                      <small className="text-muted">
                                        <FaBuilding className="me-1" />
                                        {user.businessName}
                                      </small>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <small className="text-muted">ID: {user.id}</small>
                                </div>
                              </div>
                              <div className="col-auto d-flex gap-2">
                                {selectedTab === 'pending' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(user);
                                    }}
                                    className="btn btn-sm"
                                    style={{ backgroundColor: secondaryColor, color: '#fff' }}
                                  >
                                    Review
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(user.id, user.fullName);
                                  }}
                                  className="btn btn-sm btn-danger"
                                  disabled={deletingId === user.id}
                                >
                                  {deletingId === user.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Detail Sidebar */}
          {selectedUser && selectedTab === 'pending' && (
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">User Review</h5>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="btn-close"
                    ></button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-center mb-4">
                    <div 
                      className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mb-3"
                      style={{ width: '80px', height: '80px', fontSize: '2rem', backgroundColor: secondaryColor }}
                    >
                      {selectedUser.fullName.charAt(0)}
                    </div>
                    <h4>{selectedUser.fullName}</h4>
                    <div>
                      <span className={`me-2 ${getRoleBadge(selectedUser.role)}`}>
                        {getRoleIcon(selectedUser.role)}
                        {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                      </span>
                      <span className={getStatusBadge(selectedUser.status)}>
                        {getStatusIcon(selectedUser.status)}
                        {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* User Information */}
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">
                      <FaUser className="me-2" />
                      Personal Information
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <tbody>
                          <tr>
                            <td className="fw-bold">Full Name</td>
                            <td>{selectedUser.fullName}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Email</td>
                            <td>{selectedUser.email}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Username</td>
                            <td>{selectedUser.username}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Phone</td>
                            <td>{selectedUser.phone}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Registration Date</td>
                            <td>{selectedUser.registrationDate}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">User ID</td>
                            <td>{selectedUser.id}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Seller-specific Information */}
                  {selectedUser.role === 'seller' && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3">
                        <FaBuilding className="me-2" />
                        Business Information
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <tbody>
                            {selectedUser.businessName && (
                              <tr>
                                <td className="fw-bold">Business Name</td>
                                <td>{selectedUser.businessName}</td>
                              </tr>
                            )}
                            {selectedUser.businessAddress && (
                              <tr>
                                <td className="fw-bold">Business Address</td>
                                <td>{selectedUser.businessAddress}</td>
                              </tr>
                            )}
                            {selectedUser.taxId && (
                              <tr>
                                <td className="fw-bold">Tax ID</td>
                                <td>{selectedUser.taxId}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Verification Documents */}
                  {selectedUser.verificationDocuments && selectedUser.verificationDocuments.length > 0 && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3">
                        <FaFileAlt className="me-2" />
                        Verification Documents
                      </h6>
                      <div className="row">
                        {selectedUser.verificationDocuments.map((doc, idx) => (
                          <div key={idx} className="col-md-6 mb-3">
                            <div className="card">
                              <div className="card-body">
                                <h6 className="card-title">{doc.type}</h6>
                                <div className="ratio ratio-4x3 bg-light rounded mb-2">
                                  <img
                                    src={doc.url}
                                    alt={doc.type}
                                    className="img-fluid object-fit-cover"
                                    onError={(e) => {
                                      e.target.src = 'https://via.placeholder.com/300?text=Document';
                                    }}
                                  />
                                </div>
                                <button
                                  onClick={() => window.open(doc.url, '_blank')}
                                  className="btn btn-sm w-100"
                                  style={{ borderColor: secondaryColor, color: secondaryColor }}
                                >
                                  View Full Size
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedUser.notes && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2">Notes</h6>
                      <div className="alert alert-info">
                        {selectedUser.notes}
                      </div>
                    </div>
                  )}

                  {/* Approval Notes */}
                  <div className="mb-4">
                    <h6 className="fw-bold mb-2">Approval Notes</h6>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add notes about this approval (optional)..."
                      className="form-control"
                      rows="3"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="d-grid gap-2">
                    <button
                      onClick={() => handleApprove(selectedUser.id)}
                      className="btn btn-success"
                    >
                      <FaUserCheck className="me-2" />
                      Approve User
                    </button>
                    <button
                      onClick={() => handleRejectClick(selectedUser.id, selectedUser.fullName)}
                      className="btn btn-danger"
                    >
                      <FaUserTimes className="me-2" />
                      Reject User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approved/Rejected User Details */}
          {selectedUser && selectedTab !== 'pending' && (
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">User Details</h5>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="btn-close"
                    ></button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-center mb-4">
                    <div 
                      className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white fw-bold mb-3"
                      style={{ width: '80px', height: '80px', fontSize: '2rem' }}
                    >
                      {selectedUser.fullName.charAt(0)}
                    </div>
                    <h4>{selectedUser.fullName}</h4>
                    <span className={getRoleBadge(selectedUser.role)}>
                      {getRoleIcon(selectedUser.role)}
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <tbody>
                        <tr>
                          <td className="fw-bold">Email</td>
                          <td>{selectedUser.email}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Phone</td>
                          <td>{selectedUser.phone}</td>
                        </tr>
                        {selectedUser.approvedDate && (
                          <tr>
                            <td className="fw-bold">Approved Date</td>
                            <td>{selectedUser.approvedDate}</td>
                          </tr>
                        )}
                        {selectedUser.rejectedDate && (
                          <tr>
                            <td className="fw-bold">Rejected Date</td>
                            <td>{selectedUser.rejectedDate}</td>
                          </tr>
                        )}
                        {selectedUser.rejectionReason && (
                          <tr>
                            <td className="fw-bold">Rejection Reason</td>
                            <td className="text-danger">{selectedUser.rejectionReason}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject User?</h5>
                <button type="button" className="btn-close" onClick={cancelReject}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to reject <strong>"{showRejectConfirm.userName}"</strong>? This action cannot be undone.
                </p>
                <div className="mb-3">
                  <label className="form-label">Rejection Reason (Optional)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  onClick={confirmReject}
                  className="btn btn-danger"
                >
                  Yes, Reject User
                </button>
                <button
                  onClick={cancelReject}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete User?</h5>
                <button type="button" className="btn-close" onClick={cancelDelete}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete <strong>"{showDeleteConfirm.userName}"</strong>? This will deactivate the account.
                </p>
                <div className="mb-3">
                  <label className="form-label">Deletion Reason (Required)</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Please provide a reason for deletion..."
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={confirmDelete} className="btn btn-danger">
                  Yes, Delete User
                </button>
                <button onClick={cancelDelete} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex: 11}}>
          <div className="toast show" role="alert">
            <div className="toast-header bg-success text-white">
              <FaCheckCircle className="me-2" />
              <strong className="me-auto">Success</strong>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={() => setShowSuccessMessage(null)}
              ></button>
            </div>
            <div className="toast-body">
              {showSuccessMessage.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
