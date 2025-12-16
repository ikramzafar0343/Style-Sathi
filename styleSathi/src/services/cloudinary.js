const getEnv = (k, fallback = '') => {
  try {
    const v = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[k]) || (typeof window !== 'undefined' && window[k]);
    return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
  } catch {
    return fallback;
  }
};

const cfg = () => {
  return {
    cloudName: getEnv('VITE_CLOUDINARY_CLOUD_NAME', ''),
    uploadPreset: getEnv('VITE_CLOUDINARY_UPLOAD_PRESET', ''),
    uploadFolder: getEnv('VITE_CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
  };
};

export const cloudinaryUploadImage = async (file) => {
  const { cloudName, uploadPreset, uploadFolder } = cfg();
  if (!cloudName || !uploadPreset || !(file instanceof File)) return null;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  fd.append('folder', uploadFolder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok || (data && data.error)) {
    const msg = (data && data.error && (data.error.message || data.error)) || `Cloudinary image upload failed (${res.status})`;
    throw new Error(msg);
  }
  const url = (data && (data.secure_url || data.url)) ? (data.secure_url || data.url) : null;
  return url;
};

export const cloudinaryUploadRaw = async (file) => {
  const { cloudName, uploadPreset, uploadFolder } = cfg();
  if (!cloudName || !uploadPreset || !(file instanceof File)) return null;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  fd.append('folder', uploadFolder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: fd });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok || (data && data.error)) {
    const msg = (data && data.error && (data.error.message || data.error)) || `Cloudinary raw upload failed (${res.status})`;
    throw new Error(msg);
  }
  const url = (data && (data.secure_url || data.url)) ? (data.secure_url || data.url) : null;
  return url;
};

export const cloudinaryUploadImages = async (files) => {
  const arr = Array.isArray(files) ? files.filter((f) => f instanceof File) : [];
  const urls = [];
  for (const f of arr) {
    const u = await cloudinaryUploadImage(f);
    if (u) urls.push(u);
  }
  return urls;
};
