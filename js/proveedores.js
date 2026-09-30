// ==========================================
// PROVEEDORES.JS - MÓDULO DE PROVEEDORES (CRUD & FILTROS)
// ==========================================

let proveedoresData = JSON.parse(localStorage.getItem('refa_proveedores')) || [
  { id: 1, empresa: 'Distribuidora Automotriz DANA', contacto: 'Lic. Roberto Garza', rfc: 'DAD980315RT2', telefono: '81 8345 9012', email: 'ventas@dana-refacciones.mx', categoria: 'Suspensión y Dirección', creditoDias: 30, estado: 'Activo' },
  { id: 2, empresa: 'Baleros y Retenes SYD de México', contacto: 'Ing. Sandra Pineda', rfc: 'BRS040810HP7', telefono: '55 5812 7700', email: 'pedidos@sydmexico.com', categoria: 'Suspensión y Dirección', creditoDias: 45, estado: 'Activo' },
  { id: 3, empresa: 'Frenos y Balatas Brembo / Fritec', contacto: 'Marco Aurelio Vega', rfc: 'FBF120919JK1', telefono: '33 3619 4433', email: 'mvega@fritec.com.mx', categoria: 'Frenos', creditoDias: 30, estado: 'Activo' },
  { id: 4, empresa: 'Lubricantes y Filtros Mobil / Gonher', contacto: 'Armando Cisneros', rfc: 'LFM110202TT8', telefono: '81 8150 2000', email: 'ventas@gonher-mobil.com', categoria: 'Lubricantes y Filtros', creditoDias: 15, estado: 'Activo' },
  { id: 5, empresa: 'Autopartes Eléctricas Bosch & Denso', contacto: 'Ing. Laura Salgado', rfc: 'AEB990425AA3', telefono: '55 5284 3000', email: 'atencion@bosch-autopartes.mx', categoria: 'Eléctrico', creditoDias: 30, estado: 'Activo' }
];

function saveProveedores() {
  localStorage.setItem('refa_proveedores', JSON.stringify(proveedoresData));
}

function renderProveedores() {
  const tbody = document.getElementById('tbodyProveedores');
  const searchInput = document.getElementById('searchProveedores');
  const filterCatSelect = document.getElementById('filterProveedorCategoria');
  const filterEstadoSelect = document.getElementById('filterProveedorEstado');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterCat = filterCatSelect ? filterCatSelect.value : 'todos';
  const filterEstado = filterEstadoSelect ? filterEstadoSelect.value : 'todos';

  const filtered = proveedoresData.filter(p => {
    const matchesSearch = p.empresa.toLowerCase().includes(search) || 
                          p.contacto.toLowerCase().includes(search) || 
                          p.rfc.toLowerCase().includes(search) || 
                          p.telefono.includes(search) || 
                          p.categoria.toLowerCase().includes(search);
    const matchesCat = filterCat === 'todos' || p.categoria === filterCat;
    const matchesEstado = filterEstado === 'todos' || p.estado === filterEstado;
    return matchesSearch && matchesCat && matchesEstado;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron proveedores con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(p => {
      const initials = p.empresa.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #ffedd5; color: #ea580c;">${initials}</div>
            <div>
              <div class="item-main-title">${p.empresa}</div>
              <div class="item-sub-title"><i class="fa-regular fa-envelope"></i> ${p.email || 'Sin correo'}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; color: #1e293b;"><i class="fa-regular fa-user" style="color: #64748b; font-size: 11px;"></i> ${p.contacto}</div>
        </td>
        <td><strong>${p.rfc || 'Sin RFC'}</strong></td>
        <td>
          <div><i class="fa-solid fa-phone" style="color: #64748b; font-size: 11px;"></i> ${p.telefono}</div>
        </td>
        <td>
          <span class="badge-tag" style="background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;">
            <i class="fa-solid fa-screwdriver-wrench" style="color: #ea580c; font-size: 10px;"></i> ${p.categoria}
          </span>
        </td>
        <td>
          <span style="font-weight: 700; color: ${p.creditoDias > 0 ? '#1e293b' : '#64748b'};">
            ${p.creditoDias > 0 ? p.creditoDias + ' días' : 'Contado'}
          </span>
        </td>
        <td>
          <span class="badge-tag ${p.estado === 'Activo' ? 'badge-active' : 'badge-inactive'}">
            <i class="fa-solid ${p.estado === 'Activo' ? 'fa-check' : 'fa-ban'}"></i> ${p.estado}
          </span>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-icon-action btn-action-edit" title="Editar" onclick="editarProveedor(${p.id})">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-delete" title="Eliminar" onclick="eliminarProveedor(${p.id})">
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
  if (statCredito) statCredito.innerText = proveedoresData.filter(p => p.creditoDias > 0).length;
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
  const prov = proveedoresData.find(p => p.id === id);
  if (!prov) return;
  document.getElementById('proveedorId').value = prov.id;
  document.getElementById('proveedorEmpresa').value = prov.empresa;
  document.getElementById('proveedorContacto').value = prov.contacto;
  document.getElementById('proveedorRfc').value = prov.rfc || '';
  document.getElementById('proveedorTelefono').value = prov.telefono;
  document.getElementById('proveedorCategoria').value = prov.categoria;
  document.getElementById('proveedorCredito').value = prov.creditoDias || 0;
  document.getElementById('proveedorEmail').value = prov.email || '';
  document.getElementById('proveedorEstado').value = prov.estado;
  document.getElementById('modalProveedorTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Proveedor';
  openModal('modalProveedor');
};

window.eliminarProveedor = function(id) {
  const prov = proveedoresData.find(p => p.id === id);
  if (!prov) return;
  if (confirm(`¿Está seguro de eliminar al proveedor "${prov.empresa}"?`)) {
    proveedoresData = proveedoresData.filter(p => p.id !== id);
    saveProveedores();
    renderProveedores();
    showToast('Proveedor eliminado correctamente', 'danger');
  }
};

const formProveedor = document.getElementById('formProveedor');
if (formProveedor) {
  formProveedor.addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = document.getElementById('proveedorId').value;
    const provObj = {
      id: idVal ? parseInt(idVal) : Date.now(),
      empresa: document.getElementById('proveedorEmpresa').value.trim(),
      contacto: document.getElementById('proveedorContacto').value.trim(),
      rfc: document.getElementById('proveedorRfc').value.trim().toUpperCase(),
      telefono: document.getElementById('proveedorTelefono').value.trim(),
      categoria: document.getElementById('proveedorCategoria').value,
      creditoDias: parseInt(document.getElementById('proveedorCredito').value) || 0,
      email: document.getElementById('proveedorEmail').value.trim(),
      estado: document.getElementById('proveedorEstado').value
    };

    if (idVal) {
      const index = proveedoresData.findIndex(p => p.id === parseInt(idVal));
      if (index !== -1) proveedoresData[index] = provObj;
      showToast('Proveedor actualizado con éxito', 'success');
    } else {
      proveedoresData.unshift(provObj);
      showToast('Nuevo proveedor registrado', 'success');
    }

    saveProveedores();
    renderProveedores();
    closeModal('modalProveedor');
  });
}

const searchProveedoresInput = document.getElementById('searchProveedores');
if (searchProveedoresInput) searchProveedoresInput.addEventListener('input', renderProveedores);

const filterProveedorCat = document.getElementById('filterProveedorCategoria');
if (filterProveedorCat) filterProveedorCat.addEventListener('change', renderProveedores);

const filterProveedorEst = document.getElementById('filterProveedorEstado');
if (filterProveedorEst) filterProveedorEst.addEventListener('change', renderProveedores);

// Inicializar renderizado
renderProveedores();
