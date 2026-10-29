// ==========================================
// PROVEEDORES.JS - MÓDULO DE PROVEEDORES (CRUD & FILTROS)
// Adaptado a la base de datos REFACCIONARIA (script.sql)
// ==========================================

let proveedoresData = [];

async function loadProveedores() {
  const tbody = document.getElementById('tbodyProveedores');
  try {
    const json = await apiRequest('proveedores/');
    proveedoresData = Array.isArray(json.data) ? json.data : [];
    renderProveedores();
  } catch (err) {
    console.error('Error cargando proveedores:', err);
    if (tbody && (!proveedoresData || proveedoresData.length === 0)) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #ef4444;">
        <i class="fa-solid fa-triangle-exclamation"></i> Error al cargar proveedores: ${err.message || 'Error de conexión'}.
        <br><button type="button" class="btn-primary-action" style="margin-top: 10px; display: inline-flex;" onclick="loadProveedores()">
          <i class="fa-solid fa-rotate-right"></i> Reintentar
        </button>
      </td></tr>`;
    }
    showToast(err.message || 'Error al conectar con la base de datos', 'danger');
  }
}
window.loadProveedores = loadProveedores;

function renderProveedores() {
  const tbody = document.getElementById('tbodyProveedores');
  const searchInput = document.getElementById('searchProveedores');

  if (!tbody) return;

  const search = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';

  const filtered = proveedoresData.filter(p => {
    const empresa = String(p.empresa || '').toLowerCase();
    const contacto = String(p.contacto || '').toLowerCase();
    const rfc = String(p.rfc || '').toLowerCase();
    const telefono = String(p.telefono || '').toLowerCase();
    const ciudad = String(p.direccion_cd || '').toLowerCase();
    const estado = String(p.direccion_estado || '').toLowerCase();

    return !search ||
           empresa.includes(search) ||
           contacto.includes(search) ||
           rfc.includes(search) ||
           telefono.includes(search) ||
           ciudad.includes(search) ||
           estado.includes(search);
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron proveedores con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(p => {
      const words = String(p.empresa || '').trim().split(/\s+/).filter(Boolean);
      const initials = (words.slice(0, 2).map(w => w[0]).join('') || 'PR').toUpperCase();
      const direccionCompleta = `${p.direccion_calle || ''} #${p.direccion_no || ''}, Col. ${p.direccion_colonia || ''}, ${p.direccion_cd || ''}, ${p.direccion_estado || ''} (CP ${p.direccion_cp || ''})`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #ffedd5; color: #ea580c;">${initials}</div>
            <div>
              <div class="item-main-title">${p.empresa || 'Sin nombre'}</div>
              <div class="item-sub-title"><i class="fa-solid fa-hashtag"></i> ID: #${p.id}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-dark);"><i class="fa-regular fa-user" style="color: var(--text-muted); font-size: 11px;"></i> ${p.contacto || 'Sin contacto'}</div>
        </td>
        <td><strong>${p.rfc || 'Sin RFC'}</strong></td>
        <td>
          <div><i class="fa-solid fa-phone" style="color: var(--text-muted); font-size: 11px;"></i> ${p.telefono || 'Sin teléfono'}</div>
        </td>
        <td>
          <div style="font-size: 12.5px; color: var(--text-muted); max-width: 280px; line-height: 1.4;">
            <i class="fa-solid fa-location-dot" style="color: #ea580c; font-size: 11px;"></i> ${direccionCompleta}
          </div>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-icon-action btn-action-edit" title="Editar" onclick="editarProveedor('${p.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-delete" title="Eliminar" onclick="eliminarProveedor('${p.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Actualizar contadores
  const countInfo = document.getElementById('countProveedoresInfo');
  if (countInfo) countInfo.innerText = `Mostrando ${filtered.length} de ${proveedoresData.length} proveedores`;

  const statTotal = document.getElementById('statTotalProveedores');
  if (statTotal) statTotal.innerText = proveedoresData.length;

  const statActivos = document.getElementById('statProveedoresActivos');
  if (statActivos) statActivos.innerText = proveedoresData.length;

  const statCredito = document.getElementById('statProveedoresCredito');
  if (statCredito) statCredito.innerText = proveedoresData.length;
}

const btnOpenProveedorModal = document.getElementById('btnOpenProveedorModal');
if (btnOpenProveedorModal) {
  btnOpenProveedorModal.addEventListener('click', () => {
    const form = document.getElementById('formProveedor');
    if (form) form.reset();
    const idInput = document.getElementById('proveedorId');
    if (idInput) idInput.value = '';
    const title = document.getElementById('modalProveedorTitle');
    if (title) title.innerHTML = '<i class="fa-solid fa-truck-field"></i> Nuevo Proveedor';
    openModal('modalProveedor');
  });
}

window.editarProveedor = function(id) {
  const p = proveedoresData.find(item => item.id == id);
  if (!p) return;
  document.getElementById('proveedorId').value = p.id;
  document.getElementById('proveedorEmpresa').value = p.empresa || '';
  document.getElementById('proveedorContacto').value = p.contacto || '';
  document.getElementById('proveedorRfc').value = p.rfc || '';
  document.getElementById('proveedorTelefono').value = p.telefono || '';
  document.getElementById('proveedorCalle').value = p.direccion_calle || '';
  document.getElementById('proveedorColonia').value = p.direccion_colonia || '';
  document.getElementById('proveedorNo').value = p.direccion_no || '';
  document.getElementById('proveedorCp').value = p.direccion_cp || '';
  document.getElementById('proveedorCd').value = p.direccion_cd || '';
  document.getElementById('proveedorEstado').value = p.direccion_estado || '';

  document.getElementById('modalProveedorTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Proveedor';
  openModal('modalProveedor');
};

window.eliminarProveedor = async function(id) {
  const p = proveedoresData.find(item => item.id == id);
  if (!p) return;
  if (confirm(`¿Está seguro de eliminar al proveedor "${p.empresa}"?`)) {
    try {
      await apiRequest(`proveedores/?id=${id}`, { method: 'DELETE' });
      showToast('Proveedor eliminado correctamente', 'danger');
      await loadProveedores();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
};

const formProveedor = document.getElementById('formProveedor');
if (formProveedor) {
  formProveedor.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('proveedorId').value;
    const proveedorObj = {
      empresa: document.getElementById('proveedorEmpresa').value.trim(),
      contacto: document.getElementById('proveedorContacto').value.trim(),
      rfc: document.getElementById('proveedorRfc').value.trim().toUpperCase(),
      telefono: document.getElementById('proveedorTelefono').value.trim(),
      direccion_calle: document.getElementById('proveedorCalle').value.trim(),
      direccion_colonia: document.getElementById('proveedorColonia').value.trim(),
      direccion_no: document.getElementById('proveedorNo').value.trim(),
      direccion_cp: document.getElementById('proveedorCp').value.trim(),
      direccion_cd: document.getElementById('proveedorCd').value.trim(),
      direccion_estado: document.getElementById('proveedorEstado').value.trim()
    };

    try {
      if (idVal) {
        await apiRequest(`proveedores/?id=${idVal}`, { method: 'PUT', body: JSON.stringify(proveedorObj) });
        showToast('Proveedor actualizado con éxito', 'success');
      } else {
        await apiRequest('proveedores/', { method: 'POST', body: JSON.stringify(proveedorObj) });
        showToast('Nuevo proveedor registrado', 'success');
      }
      closeModal('modalProveedor');
      await loadProveedores();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

const searchProveedoresInput = document.getElementById('searchProveedores');
if (searchProveedoresInput) searchProveedoresInput.addEventListener('input', renderProveedores);

// Inicializar: cargar datos desde la API
loadProveedores();
