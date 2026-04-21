// Content script for Project Spellbook
const pathname = new URL(window.location.href).pathname;

if (/^\/characters\/\d+\/?$/.test(pathname)) {
  const observer = new MutationObserver(() => {
    const proficiencySection = document.querySelector('.ct-subsection.ct-subsection--proficiency-groups');
    
    if (proficiencySection && !proficiencySection.querySelector('.spellbook-toggle-btn')) {
      const btn = document.createElement('button');
      btn.className = 'spellbook-toggle-btn';
      btn.textContent = 'Toggle Proficiency';
      btn.style.cssText = 'display: block; margin: 10px 0; padding: 10px 15px; background: red; color: white; border: none; cursor: pointer;';
      
      const children = Array.from(proficiencySection.children);
      btn.onclick = () => {
        children.forEach(child => {
          if (child !== btn) {
            child.style.display = child.style.display === 'none' ? '' : 'none';
          }
        });
      };
      
      proficiencySection.insertBefore(btn, proficiencySection.firstChild);
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}
