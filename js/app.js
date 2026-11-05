// ==========================================
// APP.JS - NAVEGACIÓN, SIDEBAR, MODALES Y TOASTS
// ==========================================

// SIDEBAR COLAPSABLE / EXPANDIBLE
const appSidebar = document.getElementById('appSidebar');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');

// Recuperar estado previo guardado en localStorage
if (localStorage.getItem('refa_sidebar_collapsed') === 'true' && appSidebar) {
  appSidebar.classList.add('collapsed');
  if (btnToggleSidebar) btnToggleSidebar.setAttribute('title', 'Expandir menú');
}

if (btnToggleSidebar && appSidebar) {
  btnToggleSidebar.addEventListener('click', () => {
    appSidebar.classList.toggle('collapsed');
    const isCollapsed = appSidebar.classList.contains('collapsed');
    localStorage.setItem('refa_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    btnToggleSidebar.setAttribute('title', isCollapsed ? 'Expandir menú' : 'Contraer menú');
  });
}

// ==========================================
// NAVEGACIÓN Y CAMBIO DE MÓDULOS EN SIDEBAR
// ==========================================
const navLinks = document.querySelectorAll('.nav-link');
const sections = {
  ventas: document.getElementById('moduleVentas'),
  clientes: document.getElementById('moduleClientes'),
  proveedores: document.getElementById('moduleProveedores'),
  usuarios: document.getElementById('moduleUsuarios'),
  other: document.getElementById('moduleOther')
};
const contentTitle = document.getElementById('contentTitle');
const contentBadge = document.getElementById('contentBadge');

function setActiveModule(targetName) {
  // Ocultar todas las secciones
  Object.values(sections).forEach(sec => {
    if (sec) sec.classList.add('hidden');
  });

  // Remover clase active de todos los links
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  navLinks.forEach(l => l.classList.remove('active'));

  // Activar el link correspondiente
  const activeLink = document.querySelector(`.nav-link[href="#${targetName}"]`) || navLinks[0];
  if (activeLink) {
    activeLink.classList.add('active');
    const parentLi = activeLink.closest('.nav-item');
    if (parentLi) parentLi.classList.add('active');
  }

  // Mostrar la sección correspondiente
  if (sections[targetName]) {
    sections[targetName].classList.remove('hidden');

    // Recargar datos frescos si el módulo cuenta con función de carga
    if (targetName === 'proveedores' && typeof window.loadProveedores === 'function') {
      window.loadProveedores();
    } else if (targetName === 'clientes' && typeof window.loadClientes === 'function') {
      window.loadClientes();
    } else if (targetName === 'usuarios' && typeof window.loadUsuarios === 'function') {
      window.loadUsuarios();
    }
  } else if (sections.other) {
    sections.other.classList.remove('hidden');
    const titleText = (activeLink && (activeLink.getAttribute('data-title') || activeLink.innerText.trim())) || targetName;
    if (contentTitle) contentTitle.innerText = `Módulo: ${titleText}`;
    if (contentBadge) contentBadge.innerText = `Sección activa: ${titleText}`;
  }
}
window.setActiveModule = setActiveModule;

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').replace('#', '').toLowerCase();
    if (window.location.hash !== `#${target}`) {
      window.history.pushState(null, '', `#${target}`);
    }
    setActiveModule(target);
  });
});

// Soporte para navegación directa o recarga con hash (ej. #proveedores)
window.addEventListener('DOMContentLoaded', () => {
  const initialModule = (window.location.hash || '').replace('#', '').toLowerCase();
  if (initialModule && sections[initialModule]) {
    setActiveModule(initialModule);
  }
});
window.addEventListener('hashchange', () => {
  const hashModule = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hashModule && sections[hashModule]) {
    setActiveModule(hashModule);
  }
});

// Acción para el botón salir
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('¿Desea cerrar la sesión actual?')) {
      try {
        await authApi.logout();
        updateUserProfile(null);
        showToast('Sesión cerrada correctamente.', 'success');
        handleAuthRequired();
      } catch (err) {
        showToast('Error al cerrar sesión: ' + err.message, 'danger');
      }
    }
  });
}

// ==========================================
// SISTEMA DE NOTIFICACIONES TOAST
// ==========================================
const toastNotice = document.getElementById('toastNotice');
const toastMessage = document.getElementById('toastMessage');
let toastTimeout;

function showToast(message, type = 'success') {
  if (!toastNotice || !toastMessage) return;
  clearTimeout(toastTimeout);
  toastMessage.innerText = message;
  toastNotice.className = `toast-notice show ${type}`;
  toastTimeout = setTimeout(() => {
    toastNotice.classList.remove('show');
  }, 3200);
}
window.showToast = showToast;

// ==========================================
// SISTEMA DE MODALES (ABRIR / CERRAR)
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}
window.openModal = openModal;

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}
window.closeModal = closeModal;

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(btn.getAttribute('data-close'));
  });
});

document.querySelectorAll('.custom-modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.custom-modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ==========================================
// CONTROL DE MODO OSCURO / MODO CLARO
// ==========================================
const btnThemeToggle = document.getElementById('btnThemeToggle');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleText = document.getElementById('themeToggleText');

function applyTheme(theme, notify = false) {
  const isDark = theme === 'dark';

  if (isDark) {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-sun';
    if (themeToggleText) themeToggleText.innerText = 'Modo Claro';
    if (btnThemeToggle) {
      btnThemeToggle.setAttribute('data-title', 'Modo Claro');
      btnThemeToggle.setAttribute('title', 'Cambiar a Modo Claro');
    }
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-moon';
    if (themeToggleText) themeToggleText.innerText = 'Modo Oscuro';
    if (btnThemeToggle) {
      btnThemeToggle.setAttribute('data-title', 'Modo Oscuro');
      btnThemeToggle.setAttribute('title', 'Cambiar a Modo Oscuro');
    }
  }

  localStorage.setItem('refa_theme', isDark ? 'dark' : 'light');

  if (notify && typeof showToast === 'function') {
    showToast(isDark ? 'Modo Juanja activado 🌙' : 'Modo Liz activado ☀️', 'success');
  }
}

// Inicializar tema al cargar la página
const storedTheme = localStorage.getItem('refa_theme');
const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = storedTheme ? storedTheme : (systemPrefersDark ? 'dark' : 'light');
applyTheme(initialTheme, false);

// Evento de click para alternar tema
if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
    applyTheme(isCurrentlyDark ? 'light' : 'dark', true);
  });
}

// Escuchar cambios de preferencia del sistema si el usuario no ha fijado una manualmente
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('refa_theme')) {
      applyTheme(e.matches ? 'dark' : 'light', false);
    }
  });
}

// ==========================================
// CONTROL DE ACCESO / AUTENTICACIÓN
// ==========================================
let currentRefaUser = null;

function updateUserProfile(user) {
  currentRefaUser = user;
  const avatarEl = document.getElementById('sidebarUserAvatar');
  const nameEl = document.getElementById('sidebarUserName');

  if (!user) {
    if (avatarEl) {
      avatarEl.innerText = '?';
      avatarEl.setAttribute('title', 'Sin sesión activa');
    }
    if (nameEl) nameEl.innerText = 'Iniciar sesión';
    return;
  }

  const name = user.nombre || user.username || 'Usuario';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (words.slice(0, 2).map(w => w[0]).join('') || 'U').toUpperCase();

  if (avatarEl) {
    avatarEl.innerText = initials;
    avatarEl.setAttribute('title', `${name} (@${user.username})`);
  }
  if (nameEl) {
    nameEl.innerText = name;
  }
}

function handleAuthRequired() {
  updateUserProfile(null);
  openModal('modalLogin');
}
window.handleAuthRequired = handleAuthRequired;

async function checkSession() {
  try {
    const res = await authApi.getMe();
    if (res && res.data) {
      updateUserProfile(res.data);
      closeModal('modalLogin');
    } else {
      handleAuthRequired();
    }
  } catch (err) {
    handleAuthRequired();
  }
}

// Manejador del Formulario de Login
const formLogin = document.getElementById('formLogin');
const loginErrorMsg = document.getElementById('loginErrorMessage');
const btnSubmitLogin = document.getElementById('btnSubmitLogin');

if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) return;

    if (loginErrorMsg) loginErrorMsg.innerText = '';
    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = true;
      btnSubmitLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
    }

    try {
      const res = await authApi.login(username, password);
      updateUserProfile(res.data);
      closeModal('modalLogin');
      showToast(`¡Bienvenido, ${res.data.nombre || res.data.username}!`, 'success');

      if (passwordInput) passwordInput.value = '';

      // Cargar datos del módulo activo
      const activeNav = document.querySelector('.nav-link.active');
      const activeHash = (activeNav && activeNav.getAttribute('href')?.replace('#', '')) || 'ventas';
      setActiveModule(activeHash);

    } catch (err) {
      if (loginErrorMsg) {
        loginErrorMsg.innerText = err.message || 'Credenciales inválidas';
      }
    } finally {
      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar al Sistema';
      }
    }
  });
}

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
});


