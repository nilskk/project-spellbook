// Project Spellbook — Extension popup
(function () {
  'use strict';

  var CRIT_KEY = 'spellbook_crit_settings_global';

  var descriptions = {
    normal: 'Dice double on nat 20 (default)',
    disabled: 'Crits are ignored — base dice only',
    perfect: 'Crits roll max on every die'
  };

  document.addEventListener('DOMContentLoaded', async function () {
    var result = await chrome.storage.local.get(CRIT_KEY);
    var mode = (result[CRIT_KEY] && result[CRIT_KEY].critMode) || 'normal';

    document.querySelector('.crit-btn[data-mode="' + mode + '"]').classList.add('active');
    document.getElementById('crit-desc').textContent = descriptions[mode] || descriptions.normal;

    document.querySelectorAll('.crit-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var mode = btn.dataset.mode;
        await chrome.storage.local.set({ [CRIT_KEY]: { critMode: mode } });

        document.querySelectorAll('.crit-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('crit-desc').textContent = descriptions[mode] || descriptions.normal;
      });
    });
  });
})();
