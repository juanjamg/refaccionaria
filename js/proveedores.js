// ==========================================
// PROVEEDORES.JS - MÓDULO DE PROVEEDORES (CRUD & FILTROS)
// Datos reales desde la API (SQL Server)
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
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">
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
  const filterCatSelect = document.getElementById('filterProveedorCategoria');
  const filterEstadoSelect = document.getElementById('filterProveedorEstado');

  if (!tbody) return;

  const search = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';
  const filterCat = filterCatSelect ? (filterCatSelect.value || 'todos') : 'todos';
  const filterEstado = filterEstadoSelect ? (filterEstadoSelect.value || 'todos') : 'todos';

  const filtered = proveedoresData.filter(p => {
    const empresa = String(p.empresa || '').toLowerCase();
    const contacto = String(p.contacto || '').toLowerCase();
    const rfc = String(p.rfc || '').toLowerCase();
    const telefono = String(p.telefono || '').toLowerCase();
    const categoria = String(p.categoria || '').toLowerCase();

    const matchesSearch = !search ||
                          empresa.includes(search) ||
                          contacto.includes(search) ||
                          rfc.includes(search) ||
                          telefono.includes(search) ||
                          categoria.includes(search);

    const matchesCat = filterCat === 'todos' || (p.categoria || '') === filterCat;
    const matchesEstado = filterEstado === 'todos' || (p.estado || '') === filterEstado;
    return matchesSearch && matchesCat && matchesEstado;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron proveedores con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(p => {
      const words = String(p.empresa || '').trim().split(/\s+/).filter(Boolean);
      const initials = (words.slice(0, 2).map(w => w[0]).join('') || 'PR').toUpperCase();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #ffedd5; color: #ea580c;">${initials}</div>
            <div>
              <div class="item-main-title">${p.empresa || 'Sin nombre'}</div>
              <div class="item-sub-title"><i class="fa-regular fa-envelope"></i> ${p.email || 'Sin correo'}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; color: #1e293b;"><i class="fa-regular fa-user" style="color: #64748b; font-size: 11px;"></i> ${p.contacto || 'Sin contacto'}</div>
        </td>
        <td><strong>${p.rfc || 'Sin RFC'}</strong></td>
        <td>
          <div><i class="fa-solid fa-phone" style="color: #64748b; font-size: 11px;"></i> ${p.telefono || 'Sin teléfono'}</div>
        </td>
        <td>
          <span class="badge-tag" style="background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;">
            <i class="fa-solid fa-screwdriver-wrench" style="color: #ea580c; font-size: 10px;"></i> ${p.categoria || 'General'}
          </span>
        </td>
        <td>
          <span style="font-weight: 700; color: ${(p.creditoDias || 0) > 0 ? '#1e293b' : '#64748b'};">
            ${(p.creditoDias || 0) > 0 ? p.creditoDias + ' días' : 'Contado'}
          </span>
        </td>
        <td>
          <span class="badge-tag ${p.estado === 'Activo' ? 'badge-active' : 'badge-inactive'}">
            <i class="fa-solid ${p.estado === 'Activo' ? 'fa-check' : 'fa-ban'}"></i> ${p.estado || 'Activo'}
          </span>
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
  if (statActivos) statActivos.innerText = proveedoresData.filter(p => p.estado === 'Activo').length;

  const statCredito = document.getElementById('statProveedoresCredito');
  if (statCredito) statCredito.innerText = proveedoresData.filter(p => (p.creditoDias || 0) > 0).length;
}
window.renderProveedores = renderProveedores;

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
  const prov = proveedoresData.find(p => p.id == id);
  if (!prov) return;
  document.getElementById('proveedorId').value = prov.id;
  document.getElementById('proveedorEmpresa').value = prov.empresa;
  document.getElementById('proveedorContacto').value = prov.contacto || '';
  document.getElementById('proveedorRfc').value = prov.rfc || '';
  document.getElementById('proveedorTelefono').value = prov.telefono;
  document.getElementById('proveedorCategoria').value = prov.categoria || '';
  document.getElementById('proveedorCredito').value = prov.creditoDias || 0;
  document.getElementById('proveedorEmail').value = prov.email || '';
  document.getElementById('proveedorEstado').value = prov.estado;
  document.getElementById('modalProveedorTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Proveedor';
  openModal('modalProveedor');
};

window.eliminarProveedor = async function(id) {
  const prov = proveedoresData.find(p => p.id == id);
  if (!prov) return;
  if (confirm(`¿Está seguro de eliminar al proveedor "${prov.empresa}"?`)) {
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
    const provObj = {
      empresa: document.getElementById('proveedorEmpresa').value.trim(),
      contacto: document.getElementById('proveedorContacto').value.trim(),
      rfc: document.getElementById('proveedorRfc').value.trim().toUpperCase(),
      telefono: document.getElementById('proveedorTelefono').value.trim(),
      categoria: document.getElementById('proveedorCategoria').value,
      creditoDias: parseInt(document.getElementById('proveedorCredito').value) || 0,
      email: document.getElementById('proveedorEmail').value.trim(),
      estado: document.getElementById('proveedorEstado').value
    };

    try {
      if (idVal) {
        await apiRequest(`proveedores/?id=${idVal}`, { method: 'PUT', body: JSON.stringify(provObj) });
        showToast('Proveedor actualizado con éxito', 'success');
      } else {
        await apiRequest('proveedores/', { method: 'POST', body: JSON.stringify(provObj) });
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

const filterProveedorCat = document.getElementById('filterProveedorCategoria');
if (filterProveedorCat) filterProveedorCat.addEventListener('change', renderProveedores);

const filterProveedorEst = document.getElementById('filterProveedorEstado');
if (filterProveedorEst) filterProveedorEst.addEventListener('change', renderProveedores);

// Inicializar: cargar datos desde la API
loadProveedores();
