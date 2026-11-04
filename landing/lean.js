(() => {
    const items = [
        ['problem', '01', 'Problème', 'Isolement social et accès difficile à une alimentation saine et abordable.', 'Manger seul ou recourir à la livraison ne crée ni lien durable ni repas partagé accessible.'],
        ['solution', '02', 'Solution', 'Une plateforme locale de repas faits maison partagés.', 'La Bonne Tablée met en relation des voisins pour proposer, rejoindre et organiser une tablée simplement.'],
        ['value', '03', 'Proposition de valeur', 'L’authenticité d’un repas familial, avec la flexibilité d’une app moderne.', 'Un repas convivial de proximité, avec des informations claires et une contribution choisie par chacun.'],
        ['advantage', '04', 'Avantage compétitif', 'Un ancrage local et un matching basé sur les affinités culinaires.', 'La proximité, les goûts et les besoins alimentaires servent à trouver des tablées qui font sens.'],
        ['segment', '05', 'Segments de clientèle', 'Hôtes qui aiment cuisiner ; invités, étudiants, jeunes actifs ou personnes seules.', 'La plateforme s’adresse à celles et ceux qui souhaitent recevoir ou partager un bon repas près de chez eux.'],
        ['metrics', '06', 'Indicateurs de performances', 'Repas organisés par semaine, retours et avis.', 'Ces indicateurs rendent visible l’activité réelle et la confiance qui se construit dans la communauté.'],
        ['slogan', '07', 'Slogan', 'Cuisiner, rencontrer et partager.', 'Une phrase courte qui rassemble la dimension pratique, humaine et locale du projet.'],
        ['channels', '08', 'Canaux', 'Universités lyonnaises, associations et réseaux sociaux.', 'Des relais de proximité pour atteindre les premiers membres et créer une communauté locale.'],
        ['early', '09', 'Utilisateurs pionniers', 'Étudiants lyonnais, familiers du mobile et ouverts aux rencontres.', 'Ils forment le premier terrain d’expérimentation : disponibilité, budget contraint et envie de lien.'],
        ['cost', '10', 'Coûts', 'Hébergement, développement, marketing et modération.', 'Les coûts nécessaires pour opérer une expérience fiable, accueillante et sécurisée.'],
        ['revenue', '11', 'Revenus', 'Commission fixe sur les participations financières.', 'Un modèle simple envisagé pour accompagner les contributions financières sans dénaturer le partage.']
    ].map(([id, index, title, short, detail]) => ({id, index, title, short, detail}));
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'lean.css?v=responsive-4';
    document.head.append(style);
    const firstSection = document.querySelector('main .section');
    if (!firstSection || document.querySelector('.lean-section')) return;
    firstSection.insertAdjacentHTML('afterend', `<section class="section lean-section"><div class="shell"><div class="section-head"><div><div class="kicker">Modèle d’affaires</div><h2>Un Lean Canvas, à lire et à explorer.</h2></div><p>Les hypothèses du projet sont organisées dans les neuf blocs du Lean Canvas. Sélectionnez un bloc pour en révéler l’intention.</p></div><div class="lean-app"><div class="lean-top"><div class="kicker" style="color:#ffe4d8">Vision cible</div><h2>Le repas partagé comme lien de proximité.</h2><p>Une lecture synthétique du besoin, de la solution, du modèle économique et de la communauté visée.</p></div><div class="lean-board" role="list">${items.map(item => `<button class="lean-card ${item.id}" data-lean="${item.id}" role="listitem"><span class="kicker">${item.index}</span><h3>${item.title}</h3><p>${item.short}</p><small>Voir l’intention →</small></button>`).join('')}</div><div class="lean-detail" aria-live="polite"></div></div></div></section>`);
    const root = document.querySelector('.lean-section'), board = root.querySelector('.lean-board'),
        detail = root.querySelector('.lean-detail'), mobile = window.matchMedia('(max-width: 570px)');

    function placeDetail(id) {
        const card = root.querySelector(`[data-lean="${id}"]`);
        if (mobile.matches && card) {
            card.insertAdjacentElement('afterend', detail)
        } else {
            board.insertAdjacentElement('afterend', detail)
        }
    }

    function render(id) {
        const item = items.find(entry => entry.id === id);
        detail.innerHTML = `<div class="detail-index">${item.index}</div><div><h3>${item.title}</h3><p>${item.detail}</p></div>`;
        root.querySelectorAll('[data-lean]').forEach(card => {
            const active = card.dataset.lean === id;
            card.classList.toggle('active', active);
            card.setAttribute('aria-pressed', String(active))
        });
        placeDetail(id)
    }

    board.addEventListener('click', event => {
        const card = event.target.closest('[data-lean]');
        if (card) render(card.dataset.lean)
    });
    mobile.addEventListener('change', () => {
        const active = root.querySelector('[data-lean].active');
        if (active) placeDetail(active.dataset.lean)
    });
    render('problem');
})();
