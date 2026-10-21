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
  } else if (sections.other) {
    sections.other.classList.remove('hidden');
    const titleText = (activeLink && (activeLink.getAttribute('data-title') || activeLink.innerText.trim())) || targetName;
    if (contentTitle) contentTitle.innerText = `Módulo: ${titleText}`;
    if (contentBadge) contentBadge.innerText = `Sección activa: ${titleText}`;
  }
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').replace('#', '').toLowerCase();
    setActiveModule(target);
  });
});

// Acción para el botón salir
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('¿Desea cerrar la sesión actual?')) {
      showToast('Sesión cerrada correctamente.', 'success');
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
    showToast(isDark ? 'Modo oscuro activado 🌙' : 'Modo claro activado ☀️', 'success');
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

