
function requireAuth(allowedRoles = ['admin', 'manager', 'cashier']) {
  const token = Api.getToken();
  const user = Api.getUser();

  if (!token || !user) {
    window.location.href = 'index.html';
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    // Send them to the dashboard they ARE allowed to see
    const roleHome = { admin: 'dashboard-admin.html', manager: 'dashboard-manager.html', cashier: 'dashboard-cashier.html' };
    window.location.href = roleHome[user.role] || 'index.html';
    return null;
  }

  return user;
}

function logout() {
  Api.clearSession();
  window.location.href = 'index.html';
}

function renderUserBadge(elementId = 'currentUserBadge') {
  const user = Api.getUser();
  const el = document.getElementById(elementId);
  if (el && user) {
    el.innerHTML = `${user.name} <span class="badge bg-secondary text-uppercase">${user.role}</span>`;
  }
}
// added

