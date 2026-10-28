// ==========================================
// USUARIOS.JS - MÓDULO DE USUARIOS (CRUD & FILTROS)
// Datos reales desde la API (SQL Server)
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
  const filterRolSelect = document.getElementById('filterUsuarioRol');
  const filterEstadoSelect = document.getElementById('filterUsuarioEstado');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterRol = filterRolSelect ? filterRolSelect.value : 'todos';
  const filterEstado = filterEstadoSelect ? filterEstadoSelect.value : 'todos';

  const filtered = usuariosData.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(search) ||
                          u.username.toLowerCase().includes(search) ||
                          u.email.toLowerCase().includes(search);
    const matchesRol = filterRol === 'todos' || u.rol === filterRol;
    const matchesEstado = filterEstado === 'todos' || u.estado === filterEstado;
    return matchesSearch && matchesRol && matchesEstado;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron usuarios con los filtros aplicados.</td></tr>`;
  } else {
    filtered.forEach(u => {
      const initials = u.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const roleBadgeClass = u.rol === 'Administrador' ? 'badge-role-admin' : 'badge-role-cashier';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="avatar-cell">
            <div class="circle-avatar" style="background: #ede9fe; color: #6366f1;">${initials}</div>
            <div>
              <div class="item-main-title">${u.nombre}</div>
              <div class="item-sub-title">@${u.username}</div>
            </div>
          </div>
        </td>
        <td>
          <div><i class="fa-regular fa-envelope" style="color: #64748b; font-size: 11px;"></i> ${u.email}</div>
        </td>
        <td>
          <span class="badge-tag ${roleBadgeClass}">
            <i class="fa-solid fa-shield-halved" style="font-size: 10px;"></i> ${u.rol}
          </span>
        </td>
        <td>
          <span style="font-size: 13px; color: #64748b;">${u.ultimoAcceso || 'Nunca'}</span>
        </td>
        <td>
          <span class="badge-tag ${u.estado === 'Activo' ? 'badge-active' : 'badge-inactive'}">
            <i class="fa-solid ${u.estado === 'Activo' ? 'fa-check' : 'fa-ban'}"></i> ${u.estado}
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

  const statAdmin = document.getElementById('statUsuariosAdmin');
  if (statAdmin) statAdmin.innerText = usuariosData.filter(u => u.rol === 'Administrador').length;

  const statCajeros = document.getElementById('statUsuariosCajeros');
  if (statCajeros) statCajeros.innerText = usuariosData.filter(u => u.rol === 'Cajero').length;
}

const btnOpenUsuarioModal = document.getElementById('btnOpenUsuarioModal');
if (btnOpenUsuarioModal) {
  btnOpenUsuarioModal.addEventListener('click', () => {
    const form = document.getElementById('formUsuario');
    if (form) form.reset();
    const idInput = document.getElementById('usuarioId');
    if (idInput) idInput.value = '';
    const title = document.getElementById('modalUsuarioTitle');
    if (title) title.innerHTML = '<i class="fa-solid fa-user-shield"></i> Nuevo Usuario';
    const passOpt = document.getElementById('passOptionalText');
    if (passOpt) passOpt.innerText = '*';
    const passInput = document.getElementById('usuarioPassword');
    if (passInput) passInput.required = true;
    openModal('modalUsuario');
  });
}

window.editarUsuario = function(id) {
  const usr = usuariosData.find(u => u.id == id);
  if (!usr) return;
  document.getElementById('usuarioId').value = usr.id;
  document.getElementById('usuarioNombre').value = usr.nombre;
  document.getElementById('usuarioUsername').value = usr.username;
  document.getElementById('usuarioEmail').value = usr.email;
  document.getElementById('usuarioRol').value = usr.rol;
  document.getElementById('usuarioEstado').value = usr.estado;
  document.getElementById('usuarioPassword').value = '';
  document.getElementById('usuarioPassword').required = false;
  const passOpt = document.getElementById('passOptionalText');
  if (passOpt) passOpt.innerText = '(Opcional)';
  document.getElementById('modalUsuarioTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Usuario';
  openModal('modalUsuario');
};

window.eliminarUsuario = async function(id) {
  const usr = usuariosData.find(u => u.id == id);
  if (!usr) return;
  if (confirm(`¿Está seguro de eliminar al usuario "${usr.nombre}" (@${usr.username})?`)) {
    try {
      await apiRequest(`usuarios/?id=${id}`, { method: 'DELETE' });
      showToast('Usuario eliminado del sistema', 'danger');
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
    const usrObj = {
      nombre: document.getElementById('usuarioNombre').value.trim(),
      username: document.getElementById('usuarioUsername').value.trim().toLowerCase(),
      email: document.getElementById('usuarioEmail').value.trim(),
      rol: document.getElementById('usuarioRol').value,
      estado: document.getElementById('usuarioEstado').value,
      password: document.getElementById('usuarioPassword').value
    };

    try {
      if (idVal) {
        await apiRequest(`usuarios/?id=${idVal}`, { method: 'PUT', body: JSON.stringify(usrObj) });
        showToast('Usuario actualizado con éxito', 'success');
      } else {
        await apiRequest('usuarios/', { method: 'POST', body: JSON.stringify(usrObj) });
        showToast('Nuevo usuario creado exitosamente', 'success');
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

const filterUsuarioRol = document.getElementById('filterUsuarioRol');
if (filterUsuarioRol) filterUsuarioRol.addEventListener('change', renderUsuarios);

const filterUsuarioEstado = document.getElementById('filterUsuarioEstado');
if (filterUsuarioEstado) filterUsuarioEstado.addEventListener('change', renderUsuarios);

// Inicializar: cargar datos desde la API
loadUsuarios();
