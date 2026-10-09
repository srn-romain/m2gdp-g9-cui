function activateGroup(root, buttonSelector, panelSelector, key){if(!root)return;const buttons=[...root.querySelectorAll(buttonSelector)],panels=[...root.querySelectorAll(panelSelector)];buttons.forEach(button=>button.addEventListener('click',()=>{const value=button.dataset[key];buttons.forEach(item=>{const selected=item===button;item.classList.toggle('active',selected);item.setAttribute('aria-selected',selected?'true':'false')});panels.forEach(panel=>panel.classList.toggle('active',panel.dataset[`${key}Panel`]===value))}))}
activateGroup(document.querySelector('[data-persona-app]'),'[data-persona]','[data-persona-panel]','persona');
activateGroup(document.querySelector('[data-story-app]'),'[data-story]','[data-story-panel]','story');
document.querySelector('main section:last-of-type')?.remove();
const siteNavigation=document.createElement('script');siteNavigation.src='site-nav.js?v=dossier-nav-4';document.head.append(siteNavigation);
