/**
 * Écran de démarrage affiché quand la configuration Firebase est incomplète.
 * Volontairement en DOM brut : l'application Vue ne peut pas démarrer sans clés.
 */
export function renderConfigHelp(container: HTMLElement, missing: string[]): void {
  const style = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => {
    Object.assign(el.style, styles);
    return el;
  };

  document.title = 'La Bonne Tablée — configuration requise';
  container.innerHTML = '';
  document.body.style.background = '#FAF7F2';
  document.body.style.margin = '0';

  const page = style(document.createElement('main'), {
    maxWidth: '430px',
    margin: '0 auto',
    padding: '48px 20px',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    color: '#2B2B2B',
  });

  const title = style(document.createElement('h1'), {
    fontFamily: '"Chewy", "Comic Sans MS", cursive',
    fontWeight: '400',
    fontSize: '28px',
    lineHeight: '34px',
    color: '#5B8266',
    margin: '0 0 12px',
  });
  title.textContent = 'Configuration manquante';

  const intro = style(document.createElement('p'), {
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0 0 20px',
  });
  intro.textContent =
    "L'application a besoin de ses clés Firebase pour démarrer. Renseigne le fichier " +
    'public/.env.local, puis relance npm run dev.';

  const subtitle = style(document.createElement('h2'), {
    fontSize: '15px',
    fontWeight: '700',
    margin: '0 0 8px',
  });
  subtitle.textContent = 'Variables à renseigner';

  const list = style(document.createElement('ul'), {
    margin: '0 0 24px',
    padding: '0 0 0 18px',
    fontSize: '15px',
    lineHeight: '24px',
  });
  for (const name of missing) {
    const item = document.createElement('li');
    const code = style(document.createElement('code'), {
      background: 'rgba(43, 43, 43, 0.06)',
      borderRadius: '6px',
      padding: '2px 6px',
      fontSize: '13px',
    });
    code.textContent = name;
    item.append(code);
    list.append(item);
  }

  const steps = style(document.createElement('ol'), {
    margin: '0',
    padding: '0 0 0 18px',
    fontSize: '14px',
    lineHeight: '24px',
    color: 'rgba(43, 43, 43, 0.7)',
  });
  for (const step of [
    'cp public/.env.example public/.env.local',
    'Console Firebase → Paramètres du projet → Vos applications → Web',
    'Recopier apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId',
    'Relancer npm run dev',
  ]) {
    const item = document.createElement('li');
    item.textContent = step;
    steps.append(item);
  }

  page.append(title, intro, subtitle, list, steps);
  container.append(page);

  console.info(
    `[La Bonne Tablée] Configuration Firebase incomplète : ${missing.join(', ')}. ` +
      'Renseigne public/.env.local (modèle dans public/.env.example) puis relance npm run dev.',
  );
}
