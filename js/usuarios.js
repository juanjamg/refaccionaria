// ==========================================
// USUARIOS.JS - MÓDULO DE USUARIOS (CRUD & FILTROS)
// Adaptado a la base de datos REFACCIONARIA (script.sql)
// ==========================================

let usuariosData = [];

async function loadUsuarios() {
  try {
    const json = await apiRequest('usuarios/');
    usuariosData = Array.isArray(json.data) ? json.data : [];
    renderUsuarios();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
window.loadUsuarios = loadUsuarios;

function renderUsuarios() {
  const tbody = document.getElementById('tbodyUsuarios');
  const searchInput = document.getElementById('searchUsuarios');
  const filterEstadoSelect = document.getElementById('filterUsuarioEstado');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterEstado = filterEstadoSelect ? filterEstadoSelect.value : 'todos';

  const filtered = usuariosData.filter(u => {
    const nombre = String(u.nombre || '').toLowerCase();
    const username = String(u.username || '').toLowerCase();
    const estado = String(u.estado || '');

    const matchesSearch = !search || nombre.includes(search) || username.includes(search);
    const matchesEstado = filterEstado === 'todos' || estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron usuarios con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(u => {
      const words = String(u.nombre || '').trim().split(/\s+/).filter(Boolean);
      const initials = (words.slice(0, 2).map(w => w[0]).join('') || 'US').toUpperCase();
      const esActivo = u.estado === 'Activo' || u.status === '1';
      const esAdmin = (u.rol && u.rol.toLowerCase().includes('admin')) || 
                      (u.username && u.username.toLowerCase() === 'admin') || 
                      (u.nombre && u.nombre.toLowerCase().includes('administrador'));

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #ede9fe; color: #6366f1;">${initials}</div>
            <div>
              <div class="item-main-title">${u.nombre}</div>
              <div class="item-sub-title"><i class="fa-solid fa-hashtag"></i> ID: #${u.id}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-dark);">
            <i class="fa-solid fa-at" style="color: #6366f1; font-size: 11px;"></i> ${u.username}
          </div>
          <div style="margin-top: 4px;">
            <span class="badge-tag ${esAdmin ? 'badge-role-admin' : 'badge-role-cashier'}">
              <i class="fa-solid ${esAdmin ? 'fa-shield-halved' : 'fa-cash-register'}" style="font-size: 10px;"></i> ${esAdmin ? 'Administrador' : 'Cajero / Mostrador'}
            </span>
          </div>
        </td>
        <td>
          <span class="badge-tag ${esActivo ? 'badge-active' : 'badge-inactive'}">
            <i class="fa-solid ${esActivo ? 'fa-check' : 'fa-ban'}"></i> ${esActivo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-icon-action btn-action-edit" title="Editar" onclick="editarUsuario('${u.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-delete" title="Eliminar" onclick="eliminarUsuario('${u.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Actualizar contadores
  const countInfo = document.getElementById('countUsuariosInfo');
  if (countInfo) countInfo.innerText = `Mostrando ${filtered.length} de ${usuariosData.length} usuarios`;

  const statTotal = document.getElementById('statTotalUsuarios');
  if (statTotal) statTotal.innerText = usuariosData.length;

  const adminCount = usuariosData.filter(u => {
    const rol = String(u.rol || '').toLowerCase();
    const username = String(u.username || '').toLowerCase();
    const nombre = String(u.nombre || '').toLowerCase();
    return rol.includes('admin') || username === 'admin' || username.startsWith('admin') || nombre.includes('administrador');
  }).length;

  const statAdmin = document.getElementById('statUsuariosAdmin');
  if (statAdmin) statAdmin.innerText = adminCount;

  const statCajeros = document.getElementById('statUsuariosCajeros');
  if (statCajeros) statCajeros.innerText = Math.max(0, usuariosData.length - adminCount);

  const statActivos = document.getElementById('statUsuariosActivos');
  if (statActivos) statActivos.innerText = usuariosData.filter(u => u.estado === 'Activo' || u.status === '1').length;

  const statInactivos = document.getElementById('statUsuariosInactivos');
  if (statInactivos) statInactivos.innerText = usuariosData.filter(u => u.estado === 'Inactivo' || u.status === '0').length;
}

const btnOpenUsuarioModal = document.getElementById('btnOpenUsuarioModal');
if (btnOpenUsuarioModal) {
  btnOpenUsuarioModal.addEventListener('click', () => {
    const form = document.getElementById('formUsuario');
    if (form) form.reset();
    const idInput = document.getElementById('usuarioId');
    if (idInput) idInput.value = '';
    const passInput = document.getElementById('usuarioPassword');
    if (passInput) {
      passInput.required = true;
      passInput.placeholder = '••••••••';
    }
    const passOptionalText = document.getElementById('passOptionalText');
    if (passOptionalText) passOptionalText.innerText = '* (Obligatoria para nuevo usuario)';

    const title = document.getElementById('modalUsuarioTitle');
    if (title) title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario';
    openModal('modalUsuario');
  });
}

window.editarUsuario = function(id) {
  const usuario = usuariosData.find(u => u.id == id);
  if (!usuario) return;
  document.getElementById('usuarioId').value = usuario.id;
  document.getElementById('usuarioNombre').value = usuario.nombre || '';
  document.getElementById('usuarioUsername').value = usuario.username || '';
  
  const passInput = document.getElementById('usuarioPassword');
  if (passInput) {
    passInput.value = '';
    passInput.required = false;
    passInput.placeholder = 'Dejar en blanco para no cambiarla';
  }
  const passOptionalText = document.getElementById('passOptionalText');
  if (passOptionalText) passOptionalText.innerText = '(Opcional al editar)';

  const estadoSelect = document.getElementById('usuarioStatus');
  if (estadoSelect) {
    estadoSelect.value = (usuario.status === '1' || usuario.estado === 'Activo') ? '1' : '0';
  }

  document.getElementById('modalUsuarioTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Usuario';
  openModal('modalUsuario');
};

window.eliminarUsuario = async function(id) {
  const usuario = usuariosData.find(u => u.id == id);
  if (!usuario) return;
  if ((usuario.username || '').toLowerCase() === 'admin') {
    showToast('El usuario principal "admin" no puede ser eliminado.', 'danger');
    return;
  }
  if (confirm(`¿Está seguro de eliminar al usuario "${usuario.nombre}" (@${usuario.username})?`)) {
    try {
      await apiRequest(`usuarios/?id=${id}`, { method: 'DELETE' });
      showToast('Usuario eliminado correctamente', 'danger');
      await loadUsuarios();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
};

const formUsuario = document.getElementById('formUsuario');
if (formUsuario) {
  formUsuario.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('usuarioId').value;
    const passVal = document.getElementById('usuarioPassword').value;

    const usuarioObj = {
      nombre: document.getElementById('usuarioNombre').value.trim(),
      username: document.getElementById('usuarioUsername').value.trim(),
      status: document.getElementById('usuarioStatus').value
    };

    if (passVal) {
      usuarioObj.password = passVal;
    } else if (!idVal) {
      showToast('La contraseña es obligatoria al registrar un usuario', 'danger');
      return;
    }

    try {
      if (idVal) {
        await apiRequest(`usuarios/?id=${idVal}`, { method: 'PUT', body: JSON.stringify(usuarioObj) });
        showToast('Usuario actualizado con éxito', 'success');
      } else {
        await apiRequest('usuarios/', { method: 'POST', body: JSON.stringify(usuarioObj) });
        showToast('Nuevo usuario creado', 'success');
      }
      closeModal('modalUsuario');
      await loadUsuarios();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

const searchUsuariosInput = document.getElementById('searchUsuarios');
if (searchUsuariosInput) searchUsuariosInput.addEventListener('input', renderUsuarios);

const filterUsuarioEstado = document.getElementById('filterUsuarioEstado');
if (filterUsuarioEstado) filterUsuarioEstado.addEventListener('change', renderUsuarios);

// Inicializar: cargar datos desde la API
loadUsuarios();
