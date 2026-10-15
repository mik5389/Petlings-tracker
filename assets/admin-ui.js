// Display-only player/admin layout. Database authorization stays enforced by Supabase RLS.
(function () {
  'use strict';
  const animalForm = document.querySelector('#animals > .panel:first-child');
  const recipeForms = Array.from(document.querySelectorAll('#recipes > .panel')).slice(0, 2);
  const adminControls = document.getElementById('accountStatus')?.closest('.panel');
  const main = document.querySelector('main');
  if (!animalForm || recipeForms.length !== 2 || !adminControls || !main) return;

  // Keep sign-in available without putting a disabled editor in front of players.
  const footer = document.createElement('footer');
  footer.id = 'petlingsAccountFooter';
  footer.className = 'petlings-account-footer';
  footer.innerHTML = '<span>Petlings Breeding Tracker · Fan-made community tool</span> <button type="button" id="petlingsFooterLogin" class="secondary">Admin sign in</button>';
  main.after(footer);
  const login = footer.querySelector('#petlingsFooterLogin');
  login.addEventListener('click', () => {
    // A read-only signed-in user can sign out and then use the admin login.
    const signedIn = !document.getElementById('signOut').hidden;
    if (signedIn) document.getElementById('signOut').click();
    else document.getElementById('signIn').click();
  });

  function apply() {
    const admin = typeof isAdmin !== 'undefined' && isAdmin === true;
    animalForm.hidden = !admin;
    for (const panel of recipeForms) panel.hidden = !admin;
    adminControls.hidden = !admin;
    // No credentials or database settings are shown in the player footer.
    const signedIn = !document.getElementById('signOut').hidden;
    login.textContent = signedIn && !admin ? 'Sign out' : 'Admin sign in';
    login.hidden = admin;
    // Discovery's own script controls the administrator-only undocumented view.
  }

  const priorRenderAll = renderAll;
  renderAll = function (...args) {
    const result = priorRenderAll.apply(this, args);
    apply();
    return result;
  };
  // In case authentication completed before this file finished loading.
  apply();
})();
