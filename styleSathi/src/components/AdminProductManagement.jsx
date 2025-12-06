import { useEffect, useState, useRef } from 'react';
import { FaArrowLeft, FaSearch, FaFilter, FaUpload, FaTrash, FaCubes, FaEye } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import { catalogApi, resolveAssetUrl } from '../services/api';

const AdminProductManagement = ({ onBack, token }) => {
  const mainColor = '#2c67c4';
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [arPreviewUrl, setArPreviewUrl] = useState('');
  const [showArPreview, setShowArPreview] = useState(false);
  const fileInputRef = useRef(null);
  const convertInputRef = useRef(null);

  const ensureModelViewer = () => {
    if (!document.querySelector('script[data-model-viewer]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.dataset.modelViewer = '1';
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(s);
    }
  };

  const ensureThreeExporters = async () => {
    if (window.THREE && window.THREE.GLTFExporter && window.THREE.SVGLoader) return;
    const add = (src, attrs = {}) => new Promise((resolve) => {
      const s = document.createElement('script');
      Object.entries(attrs).forEach(([k, v]) => (s[k] = v));
      s.src = src; s.onload = () => resolve(); document.head.appendChild(s);
    });
    if (!window.THREE) await add('https://unpkg.com/three@0.160.0/build/three.min.js');
    if (!window.THREE.GLTFExporter) await add('https://unpkg.com/three@0.160.0/examples/js/Exporters/GLTFExporter.js');
    if (!window.THREE.SVGLoader) await add('https://unpkg.com/three@0.160.0/examples/js/loaders/SVGLoader.js');
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const list = await catalogApi.getProducts();
      setProducts(Array.isArray(list) ? list : (list.products || []));
    } catch { setProducts([]); }
    setLoading(false);
  };

  useEffect(() => {
    setTimeout(() => loadProducts(), 0);
    const inval = () => loadProducts();
    window.addEventListener('catalogInvalidated', inval);
    ensureModelViewer();
    return () => window.removeEventListener('catalogInvalidated', inval);
  }, []);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matches = !q || [p.id, p.title, p.brand, p.sku].map((v) => String(v || '').toLowerCase()).some((t) => t.includes(q));
    const catName = p?.category?.name || '';
    const catOk = categoryFilter === 'all' || catName.toLowerCase() === categoryFilter;
    return matches && catOk;
  });

  const handleUploadGlb = async (product, file) => {
    setUploadingId(product.id);
    try {
      const fd = new FormData();
      fd.append('model_glb', file, file.name);
      fd.append('category_id', String(product?.category?.id || ''));
      await catalogApi.updateProductMultipart(token, product.id, fd);
      window.dispatchEvent(new Event('catalogInvalidated'));
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'product-glb', title: 'Model Updated', message: `GLB uploaded for ${product.title}`, time: 'Just now' } }));
    } catch (e) {
      alert(`GLB upload failed: ${e.message}`);
    }
    setUploadingId(null);
  };

  const convertImageToGlb = async (file) => {
    await ensureThreeExporters();
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 2;
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
    const url = URL.createObjectURL(file);
    const texLoader = new THREE.TextureLoader();
    const texture = await new Promise((resolve, reject) => texLoader.load(url, resolve, undefined, reject));
    const geom = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(geom, mat);
    scene.add(mesh);
    const exporter = new THREE.GLTFExporter();
    return await new Promise((resolve, reject) => {
      try {
        exporter.parse(scene, (res) => {
          const blob = new Blob([res], { type: 'model/gltf-binary' });
          resolve(blob);
        }, { binary: true });
      } catch (e) { reject(e); }
    });
  };

  const convertSvgToGlb = async (file) => {
    await ensureThreeExporters();
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 2;
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
    const text = await file.text();
    const loader = new THREE.SVGLoader();
    const data = loader.parse(text);
    data.paths.forEach((path) => {
      const material = new THREE.MeshBasicMaterial({ color: path.color || 0x222222 });
      const shapes = THREE.SVGLoader.createShapes(path);
      shapes.forEach((shape) => {
        const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
        const mesh = new THREE.Mesh(geom, material);
        scene.add(mesh);
      });
    });
    const exporter = new THREE.GLTFExporter();
    return await new Promise((resolve, reject) => {
      try {
        exporter.parse(scene, (res) => {
          const blob = new Blob([res], { type: 'model/gltf-binary' });
          resolve(blob);
        }, { binary: true });
      } catch (e) { reject(e); }
    });
  };

  const handleConvertAndUpload = async (product, file) => {
    try {
      const isSvg = file.name.toLowerCase().endsWith('.svg');
      const blob = isSvg ? await convertSvgToGlb(file) : await convertImageToGlb(file);
      const convFile = new File([blob], `${product.sku || product.id}.glb`, { type: 'model/gltf-binary' });
      await handleUploadGlb(product, convFile);
    } catch (e) {
      alert(`Conversion failed: ${e.message}`);
    }
  };

  const handleDelete = async (product, reason) => {
    setDeletingId(product.id);
    try {
      await catalogApi.deleteProduct(token, product.id, reason);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'product-delete', title: 'Product Deleted', message: `${product.title} removed`, time: 'Just now' } }));
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
    setDeletingId(null);
  };

  const openArPreview = (glbUrl) => {
    if (!glbUrl) { alert('No GLB available'); return; }
    setArPreviewUrl(resolveAssetUrl(glbUrl));
    setShowArPreview(true);
  };

  return (
    <div className="min-vh-100 bg-light">
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-link text-decoration-none" onClick={onBack} style={{ color: mainColor }}>
                <FaArrowLeft /> Back to Dashboard
              </button>
              <h1 className="h4 fw-bold mb-0" style={{ color: mainColor }}>Admin Product Management</h1>
            </div>
            <div className="d-flex align-items-center gap-4">
              <NotificationBell mainColor={mainColor} secondaryColor={mainColor} />
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-end mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="input-group" style={{ maxWidth: '320px' }}>
              <span className="input-group-text bg-white border-end-0"><FaSearch style={{ color: mainColor }} /></span>
              <input className="form-control border-start-0" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {[...new Set(products.map((p) => p?.category?.name).filter(Boolean))].map((name) => (
                  <option key={name} value={String(name).toLowerCase()}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 text-center text-muted">Loading products...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Brand</th>
                      <th>Category</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>GLB</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>PRD-{String(p.id).padStart(4, '0')}</td>
                        <td className="fw-semibold">{p.title}</td>
                        <td>{p.brand || '-'}</td>
                        <td>{p?.category?.name || '-'}</td>
                        <td className="small text-muted">{p.sku || '-'}</td>
                        <td>₹{Number(p.price || 0).toFixed(2)}</td>
                        <td>
                          {p.model_glb_url ? (
                            <span className="badge bg-success">Available</span>
                          ) : (
                            <span className="badge bg-warning">Missing</span>
                          )}
                        </td>
                        <td className="d-flex align-items-center gap-2">
                          <button className="btn btn-sm btn-outline-primary" disabled={uploadingId === p.id} onClick={() => fileInputRef.current?.click()}>
                            <FaUpload /> Upload GLB
                          </button>
                          <input ref={fileInputRef} type="file" accept=".glb" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadGlb(p, f); e.target.value=''; }} />
                          <button className="btn btn-sm btn-outline-secondary" disabled={uploadingId === p.id} onClick={() => convertInputRef.current?.click()}>
                            <FaCubes /> Convert PNG/SVG
                          </button>
                          <input ref={convertInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleConvertAndUpload(p, f); e.target.value=''; }} />
                          <button className="btn btn-sm btn-outline-success" onClick={() => openArPreview(p.model_glb_url)}>
                            <FaEye /> Review AR
                          </button>
                          <button className="btn btn-sm btn-outline-danger" disabled={deletingId === p.id} onClick={() => {
                            const reason = prompt('Enter reason for deletion');
                            if (reason && reason.trim()) handleDelete(p, reason.trim());
                          }}>
                            <FaTrash /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showArPreview && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: '#00000055' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">AR Preview</h5>
                <button type="button" className="btn-close" onClick={() => setShowArPreview(false)}></button>
              </div>
              <div className="modal-body">
                {arPreviewUrl ? (
                  <model-viewer src={arPreviewUrl} ar ar-modes="webxr scene-viewer quick-look" camera-controls style={{ width: '100%', height: '400px' }}></model-viewer>
                ) : (
                  <div className="text-center text-muted">No model URL</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductManagement;
