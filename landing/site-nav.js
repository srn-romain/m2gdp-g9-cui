(() => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const current = location.pathname.split('/').pop() || 'index.html';
    const groups = [{
        label: '01 · Cadrage',
        active: ['projet.html', 'lean.html', 'vpc.html'].includes(current),
        items: [['projet.html', 'Projet & équipe'], ['lean.html', 'Lean Canvas'], ['vpc.html', 'Value Proposition Canvas']]
    }, {
        label: '02 · Recherche & UX',
        active: ['documentation.html', 'parcours.html', 'design.html'].includes(current),
        items: [['documentation.html', 'Personas & storyboard'], ['parcours.html', 'User Journey Mapping'], ['design.html', 'Maquettes & design system']]
    }, {
        label: '03 · Produit',
        active: current === 'produit.html',
        items: [['produit.html', 'Démo de l’application'], ['https://labonnetablee-landing.pages.dev', 'Site vitrine', true], ['https://labonnetablee.pages.dev', 'Prototype mobile', true]]
    }, {
        label: '04 · Roadmap',
        active: current === 'pilotage.html',
        items: [['pilotage.html', 'Roadmap & scénarios'], ['https://github.com/users/srn-romain/projects/2/views/1', 'Roadmap GitHub', true]]
    }];
    const link = ([href, label, external]) => `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    nav.innerHTML = `<a class="nav-home ${current === 'index.html' ? 'active' : ''}" href="index.html"${current === 'index.html' ? ' aria-current="page"' : ''}>Accueil</a>` + groups.map(group => `<details class="nav-group"><summary class="${group.active ? 'active' : ''}">${group.label}</summary><div class="nav-menu">${group.items.map(link).join('')}</div></details>`).join('');
    const brand = document.querySelector('.brand'), wordmark = brand?.querySelector('img');
    if (brand && wordmark && !brand.querySelector('.brand-mark')) {
        wordmark.classList.add('brand-wordmark');
        brand.insertAdjacentHTML('beforeend', '<img class="brand-mark" src="assets/mijote-icon-transparent.png?v=mijote-transparent-1" alt="">')
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-menu-button';
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i></i><i></i><i></i>';
    nav.before(toggle);
    const closeMenu = () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Ouvrir le menu')
    };
    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu')
    });
    nav.querySelectorAll('a').forEach(item => item.addEventListener('click', closeMenu));
    nav.querySelectorAll('.nav-group').forEach(item => item.addEventListener('toggle', () => {
        if (item.open) nav.querySelectorAll('.nav-group').forEach(other => {
            if (other !== item) other.open = false
        })
    }));
    const github = 'https://github.com/srn-romain/m2gdp-g9-cui', footer = document.querySelector('.footer');
    if (footer && !footer.querySelector('.github-link')) footer.insertAdjacentHTML('beforeend', `<a class="github-link" href="${github}" target="_blank" rel="noopener noreferrer">Voir le dépôt GitHub</a>`);
    if (current === 'projet.html') {
        const intro = document.querySelector('.page-head p');
        if (intro && !document.querySelector('.project-github')) intro.insertAdjacentHTML('afterend', `<p><a class="github-link project-github" href="${github}" target="_blank" rel="noopener noreferrer">Consulter le code source</a></p>`);
    }
})();
(() => {
    const current = location.pathname.split('/').pop() || 'index.html';
    if (current !== 'projet.html') return;
    const intro = document.querySelector('.page-head p');
    if (intro && !document.querySelector('.terminology')) intro.insertAdjacentHTML('afterend', '<div class="terminology" aria-label="Vocabulaire produit"><span class="term-chip"><b>Tablée</b> : l’objet principal à créer, rejoindre ou consulter.</span><span class="term-chip"><b>Repas partagé</b> : le concept, cuisiner, rencontrer et partager.</span></div>');
    const terms = document.querySelector('.terminology');
    if (terms && !document.querySelector('.lean-entry')) terms.insertAdjacentHTML('afterend', '<p class="lean-entry"><a class="button secondary" href="lean.html">Consulter le Lean Canvas</a></p>');
    const script = document.createElement('script');
    script.src = 'lean.js?v=responsive-3';
    document.head.append(script)
})();
