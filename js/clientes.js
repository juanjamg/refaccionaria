// ==========================================
// CLIENTES.JS - MÓDULO DE CLIENTES (CRUD & FILTROS)
// ==========================================

let clientesData = JSON.parse(localStorage.getItem('refa_clientes')) || [
  { id: 1, nombre: 'Taller Mecánico El Pistón Veloz', rfc: 'MEVC850412H81', telefono: '55 4123 8901', email: 'el.piston@gmail.com', tipo: 'Taller Mecánico', estado: 'Activo' },
  { id: 2, nombre: 'Auto Servicio Continental S.A.', rfc: 'ASC920914PT5', telefono: '55 8899 1122', email: 'contacto@continental-auto.mx', tipo: 'Taller Mecánico', estado: 'Activo' },
  { id: 3, nombre: 'Lic. Fernando Morales Ochoa', rfc: 'MOOF780210K12', telefono: '55 6721 3490', email: 'f.morales@outlook.com', tipo: 'Particular', estado: 'Activo' },
  { id: 4, nombre: 'Flotillas y Transportes del Centro', rfc: 'FTC050119LM9', telefono: '55 3300 4455', email: 'mantenimiento@flotillascentro.com', tipo: 'Flotilla', estado: 'Activo' },
  { id: 5, nombre: 'Refacciones y Servicios La Curva', rfc: 'RSLC120304Q90', telefono: '55 9012 3344', email: 'lacurva.talleres@yahoo.com', tipo: 'Taller Mecánico', estado: 'Inactivo' }
];

function saveClientes() {
  localStorage.setItem('refa_clientes', JSON.stringify(clientesData));
}

function renderClientes() {
  const tbody = document.getElementById('tbodyClientes');
  const searchInput = document.getElementById('searchClientes');
  const filterTipoSelect = document.getElementById('filterClienteTipo');
  const filterEstadoSelect = document.getElementById('filterClienteEstado');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterTipo = filterTipoSelect ? filterTipoSelect.value : 'todos';
  const filterEstado = filterEstadoSelect ? filterEstadoSelect.value : 'todos';

  const filtered = clientesData.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(search) || 
                          c.rfc.toLowerCase().includes(search) || 
                          c.telefono.includes(search) || 
                          c.email.toLowerCase().includes(search);
    const matchesTipo = filterTipo === 'todos' || c.tipo === filterTipo;
    const matchesEstado = filterEstado === 'todos' || c.estado === filterEstado;
    return matchesSearch && matchesTipo && matchesEstado;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron clientes con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(c => {
      const initials = c.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #e0f2fe; color: #0284c7;">${initials}</div>
            <div>
              <div class="item-main-title">${c.nombre}</div>
              <div class="item-sub-title"><i class="fa-solid fa-tag"></i> ${c.tipo}</div>
            </div>
          </div>
        </td>
        <td><strong>${c.rfc || 'Sin RFC'}</strong></td>
        <td>
          <div><i class="fa-solid fa-phone" style="color: #64748b; font-size: 11px;"></i> ${c.telefono}</div>
        </td>
        <td>
          <div><i class="fa-regular fa-envelope" style="color: #64748b; font-size: 11px;"></i> ${c.email || 'N/A'}</div>
        </td>
        <td>
          <span class="badge-tag ${c.estado === 'Activo' ? 'badge-active' : 'badge-inactive'}">
            <i class="fa-solid ${c.estado === 'Activo' ? 'fa-check' : 'fa-ban'}"></i> ${c.estado}
          </span>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-icon-action btn-action-edit" title="Editar" onclick="editarCliente(${c.id})">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-delete" title="Eliminar" onclick="eliminarCliente(${c.id})">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Actualizar contadores
  const countInfo = document.getElementById('countClientesInfo');
  if (countInfo) countInfo.innerText = `Mostrando ${filtered.length} de ${clientesData.length} clientes`;

  const statTotal = document.getElementById('statTotalClientes');
  if (statTotal) statTotal.innerText = clientesData.length;

  const statActivos = document.getElementById('statClientesActivos');
  if (statActivos) statActivos.innerText = clientesData.filter(c => c.estado === 'Activo').length;

  const statTalleres = document.getElementById('statClientesTalleres');
  if (statTalleres) statTalleres.innerText = clientesData.filter(c => c.tipo === 'Taller Mecánico').length;
}

const btnOpenClienteModal = document.getElementById('btnOpenClienteModal');
if (btnOpenClienteModal) {
  btnOpenClienteModal.addEventListener('click', () => {
    const form = document.getElementById('formCliente');
    if (form) form.reset();
    const idInput = document.getElementById('clienteId');
    if (idInput) idInput.value = '';
    const title = document.getElementById('modalClienteTitle');
    if (title) title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Cliente';
    openModal('modalCliente');
  });
}

window.editarCliente = function(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (!cliente) return;
  document.getElementById('clienteId').value = cliente.id;
  document.getElementById('clienteNombre').value = cliente.nombre;
  document.getElementById('clienteTipo').value = cliente.tipo;
  document.getElementById('clienteRfc').value = cliente.rfc || '';
  document.getElementById('clienteTelefono').value = cliente.telefono;
  document.getElementById('clienteEmail').value = cliente.email || '';
  document.getElementById('clienteEstado').value = cliente.estado;
  document.getElementById('modalClienteTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Cliente';
  openModal('modalCliente');
};

window.eliminarCliente = function(id) {
  const cliente = clientesData.find(c => c.id === id);
  if (!cliente) return;
  if (confirm(`¿Está seguro de eliminar a "${cliente.nombre}"?`)) {
    clientesData = clientesData.filter(c => c.id !== id);
    saveClientes();
    renderClientes();
    showToast('Cliente eliminado del catálogo', 'danger');
  }
};

const formCliente = document.getElementById('formCliente');
if (formCliente) {
  formCliente.addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = document.getElementById('clienteId').value;
    const clienteObj = {
      id: idVal ? parseInt(idVal) : Date.now(),
      nombre: document.getElementById('clienteNombre').value.trim(),
      tipo: document.getElementById('clienteTipo').value,
      rfc: document.getElementById('clienteRfc').value.trim().toUpperCase(),
      telefono: document.getElementById('clienteTelefono').value.trim(),
      email: document.getElementById('clienteEmail').value.trim(),
      estado: document.getElementById('clienteEstado').value
    };

    if (idVal) {
      const index = clientesData.findIndex(c => c.id === parseInt(idVal));
      if (index !== -1) clientesData[index] = clienteObj;
      showToast('Cliente actualizado con éxito', 'success');
    } else {
      clientesData.unshift(clienteObj);
      showToast('Nuevo cliente registrado', 'success');
    }

    saveClientes();
    renderClientes();
    closeModal('modalCliente');
  });
}

const searchClientesInput = document.getElementById('searchClientes');
if (searchClientesInput) searchClientesInput.addEventListener('input', renderClientes);

const filterClienteTipo = document.getElementById('filterClienteTipo');
if (filterClienteTipo) filterClienteTipo.addEventListener('change', renderClientes);

const filterClienteEstado = document.getElementById('filterClienteEstado');
if (filterClienteEstado) filterClienteEstado.addEventListener('change', renderClientes);

// Inicializar renderizado
renderClientes();
