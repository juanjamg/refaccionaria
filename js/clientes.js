// ==========================================
// CLIENTES.JS - MÓDULO DE CLIENTES (CRUD & FILTROS)
// Adaptado a la base de datos REFACCIONARIA (script.sql)
// ==========================================

let clientesData = [];

async function loadClientes() {
  try {
    const json = await apiRequest('clientes/');
    clientesData = Array.isArray(json.data) ? json.data : [];
    renderClientes();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
window.loadClientes = loadClientes;

function renderClientes() {
  const tbody = document.getElementById('tbodyClientes');
  const searchInput = document.getElementById('searchClientes');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = clientesData.filter(c => {
    const nombre = String(c.nombre || '').toLowerCase();
    const rfc = String(c.rfc || '').toLowerCase();
    const calle = String(c.direccion_calle || '').toLowerCase();
    const numero = String(c.direccion_numero || '').toLowerCase();
    const cp = String(c.direccion_cp || '').toLowerCase();
    const cd = String(c.direccion_cd || '').toLowerCase();

    return !search ||
           nombre.includes(search) ||
           rfc.includes(search) ||
           calle.includes(search) ||
           numero.includes(search) ||
           cp.includes(search) ||
           cd.includes(search);
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron clientes registrados con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(c => {
      const words = String(c.nombre || '').trim().split(/\s+/).filter(Boolean);
      const initials = (words.slice(0, 2).map(w => w[0]).join('') || 'CL').toUpperCase();

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #e0f2fe; color: #0284c7;">${initials}</div>
            <div>
              <div class="item-main-title">${c.nombre}</div>
              <div class="item-sub-title"><i class="fa-solid fa-id-card"></i> ID: #${c.id}</div>
            </div>
          </div>
        </td>
        <td><strong>${c.rfc || 'Sin RFC'}</strong></td>
        <td>
          <div><i class="fa-solid fa-location-dot" style="color: #64748b; font-size: 11px;"></i> ${c.direccion_calle} #${c.direccion_numero}</div>
        </td>
        <td>
          <div><i class="fa-solid fa-city" style="color: #64748b; font-size: 11px;"></i> ${c.direccion_cd} (CP: ${c.direccion_cp})</div>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-icon-action btn-action-edit" title="Editar" onclick="editarCliente('${c.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-delete" title="Eliminar" onclick="eliminarCliente('${c.id}')">
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
  if (statActivos) statActivos.innerText = clientesData.length;

  const statTalleres = document.getElementById('statClientesTalleres');
  if (statTalleres) statTalleres.innerText = clientesData.filter(c => (c.nombre || '').toLowerCase().includes('taller')).length;
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
  const cliente = clientesData.find(c => c.id == id);
  if (!cliente) return;
  document.getElementById('clienteId').value = cliente.id;
  document.getElementById('clienteNombre').value = cliente.nombre || '';
  document.getElementById('clienteRfc').value = cliente.rfc || '';
  document.getElementById('clienteCalle').value = cliente.direccion_calle || '';
  document.getElementById('clienteNumero').value = cliente.direccion_numero || '';
  document.getElementById('clienteCp').value = cliente.direccion_cp || '';
  document.getElementById('clienteCd').value = cliente.direccion_cd || '';

  document.getElementById('modalClienteTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Cliente';
  openModal('modalCliente');
};

window.eliminarCliente = async function(id) {
  const cliente = clientesData.find(c => c.id == id);
  if (!cliente) return;
  if (confirm(`¿Está seguro de eliminar a "${cliente.nombre}"?`)) {
    try {
      await apiRequest(`clientes/?id=${id}`, { method: 'DELETE' });
      showToast('Cliente eliminado del catálogo', 'danger');
      await loadClientes();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
};

const formCliente = document.getElementById('formCliente');
if (formCliente) {
  formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('clienteId').value;
    const clienteObj = {
      nombre: document.getElementById('clienteNombre').value.trim(),
      rfc: document.getElementById('clienteRfc').value.trim().toUpperCase() || null,
      direccion_calle: document.getElementById('clienteCalle').value.trim(),
      direccion_numero: document.getElementById('clienteNumero').value.trim(),
      direccion_cp: document.getElementById('clienteCp').value.trim(),
      direccion_cd: document.getElementById('clienteCd').value.trim()
    };

    try {
      if (idVal) {
        await apiRequest(`clientes/?id=${idVal}`, { method: 'PUT', body: JSON.stringify(clienteObj) });
        showToast('Cliente actualizado con éxito', 'success');
      } else {
        await apiRequest('clientes/', { method: 'POST', body: JSON.stringify(clienteObj) });
        showToast('Nuevo cliente registrado', 'success');
      }
      closeModal('modalCliente');
      await loadClientes();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

const searchClientesInput = document.getElementById('searchClientes');
if (searchClientesInput) searchClientesInput.addEventListener('input', renderClientes);

// Inicializar: cargar datos desde la API
loadClientes();
